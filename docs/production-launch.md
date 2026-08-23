# Production launch architecture

This is a launch plan, not an instruction to publish an unverified application. Production is
blocked until every release gate below is green.

## Hosting decision

Use AWS as the public and execution edge: Route 53/DNS, ACM, CloudFront for the static landing
site, an Application Load Balancer for the dashboard/API/voice hostnames, and AWS WAF before
opening public traffic. Do not place Cloudflare, Vercel, or another proxy in the request path.

| Surface | Production home | Reason |
| --- | --- | --- |
| Landing site | AWS S3 + CloudFront | Static Next.js output, cached globally through an AWS-only edge. |
| Dashboard | AWS ECS/Fargate behind an ALB | Normal signed-in Next.js UI. Keep all server secrets server-side. |
| Fastify control-plane API | AWS ECS/Fargate behind an ALB | Long-lived streaming, workers, WebSockets, and explicit IAM task roles need a persistent Node runtime. |
| Pipecat voice service | Separate AWS ECS/Fargate service | WebRTC/audio streams cannot safely run in a static host or short-lived serverless function. |
| Database and auth | Supabase in the selected production region | Managed Postgres, backups, JWT auth, and RLS. |
| Distributed limits/cache | Upstash Redis | Shared rate limits across every API instance. |

There is no secure, reliable, fully-free production option for continuous voice/WebRTC, managed
Postgres, LLM inference, and a public API. Use free tiers only for the static landing site and
small Redis usage; set provider budget alerts before opening traffic.

## Region decision

For Indian users, use **Singapore (`ap-southeast-1`)** for the API and voice services unless a
measured staging benchmark proves a different location better. The production credentials were
checked read-only and can reach Nova Pro and Polly generative voices there. Amazon Transcribe
streaming is also available there.

Do not move the complete voice stack to Mumbai merely because it is geographically closer:
Amazon Polly's generative engine is not currently offered in `ap-south-1`. Mumbai can be used
for services that do not depend on that engine only after a dedicated compatibility test.

## Required production configuration

Set these in the hosting provider's encrypted secret store, never in the browser bundle or a
repository file:

- `API_CORS_ORIGINS` with only the exact `https://` dashboard domains.
- `API_TRUST_PROXY_CIDRS` for the ALB/private ingress network, never `true` for all callers.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- `REDIS_URL` for BullMQ workers, using a TLS Redis endpoint.
- `DATABASE_URL` for the runtime pool and `DATABASE_DIRECT_URL` only for the one-off migration
  job.
- Supabase server credentials, widget signing secret, connection encryption key, and webhook
  signing secret.
- No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in ECS. Attach the least-privilege CDK task
  role instead.

The API now refuses to boot in production without Upstash rate limiting and HTTPS-only CORS.
Redis errors fail closed; they do not turn into unlimited public traffic.

## Release gates

1. Create a separate Supabase **staging** project and apply migrations `0013` through `0015`,
   then re-apply `manual/10_rls_policies.sql`.
2. Run `npm run db:verify` using staging credentials. It must prove cross-tenant read, insert,
   update, and delete attempts are blocked.
3. Replace the API's service-role database connection with a restricted runtime database role
   before a sensitive-customer launch. The existing service role bypasses RLS; this is a
   production security gate, not an acceptable final state. Every request must set its tenant
   transaction context before querying tenant tables.
4. Configure Upstash and explicit HTTPS CORS/proxy CIDRs; run the production environment
   preflight until it passes.
5. Import the safe Postman collection and run its read-only checks with a dedicated test user.
   Run mutation smoke tests only in staging because they create agents, knowledge, model calls,
   and billing usage.
6. Deploy to a private staging domain first. Verify readiness, tenant denial, widget wrong-origin
   denial, webhook HMAC rejection, rate-limit denial, logs redaction, and a complete voice turn.
7. Rotate the local long-lived AWS access key after the first task-role deployment, enable MFA,
   and set AWS/Supabase budget and security alerts.
8. Promote the exact tested image to production with an ALB health-check deploy gate and rollback
   target. Do not rebuild a different artifact during promotion.

## AWS edge rules

- Route the marketing hostname only to CloudFront; route the Dashboard, API, and Voice hostnames
  only to the ALB. Do not make one hostname serve both CloudFront and ALB origins.
- Attach AWS WAF managed rules and a per-IP rate limit for `/v1/widget/session` and
  `/api/web-agent/session` before public launch.
- Permit only the required methods, redirect all HTTP traffic to HTTPS, and keep dashboard/admin
  paths behind Supabase auth.
- Send ALB, WAF, and ECS security events to retained CloudWatch/S3 destinations; task security
  groups must admit inbound traffic only from the ALB.

## Postman

Import `postman/Voomate-Safe-Production-Checks.postman_collection.json` and its matching
environment file. Fill only the local Postman variables. The collection intentionally excludes
AWS keys, Supabase service role, database URLs, signing secrets, and destructive production
requests.
