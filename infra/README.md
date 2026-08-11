# @voomate/infra

AWS CDK definitions. **Written, not deployed** — Phase 0 defines the infrastructure so that
connecting services in Phase 1 is a `cdk deploy`, not a design exercise.

```
bin/voomate.ts          app entry — resolves stage, wires stacks
lib/config.ts         per-stage config; the region constraint lives here
lib/storage-stack.ts  S3: crawl archive, widget assets
lib/runtime-stack.ts  the IAM role the control-plane API runs as
```

```bash
npm run synth --workspace @voomate/infra              # dev
npx cdk synth -c stage=prod --workspace @voomate/infra
```

`synth` needs no AWS credentials. `deploy` does, and there are none in this repo by design.

## Region is not a free choice

Bedrock (Nova Pro, Titan embeddings), Transcribe streaming with multi-language identification,
Polly generative voices, and Chime SDK media pipelines must all be in the **same region**.
Cross-region hops spend latency the 1.2s speech-to-speech budget does not have. `us-east-1` is
the pinned choice — re-check the service tables before changing it.

Retrieval is the deliberate exception: vectors live in Supabase Postgres, not AWS. Create the
Supabase project in the region closest to `us-east-1` (`us-east-1` itself is offered) so the
one hop that leaves AWS stays a few milliseconds rather than a few hundred.

## There is no knowledge stack

Vectors are rows in the tenant database — see
[ADR 0005](../docs/adr/0005-supabase-pgvector.md), which supersedes ADR 0001. A vector index
that is a Postgres index needs no CloudFormation resource, no per-tenant provisioning call,
and has no per-account quota to run into. AWS's remaining role in retrieval is turning text
into embeddings, which is one `bedrock:InvokeModel` on the Titan model.

This is why an earlier design was abandoned rather than tuned: Bedrock Knowledge Bases cap at
**100 per account and the quota is not adjustable**, and one KB per tenant made that a hard
ceiling of 100 merchants.

## Tenants are not CloudFormation resources

Merchants sign up continuously, and a stack deploy per signup is not a product. Tenant
isolation is therefore enforced in two places, neither of them here:

- **Postgres RLS** — every tenant table carries `organization_id` and a policy that checks it
  (`packages/db/migrations/manual/10_rls_policies.sql`).
- **Application scoping** — `tenantScope()` on every query, because the API holds the service
  role key, and the service role bypasses RLS.

Both layers are required. Either one alone is a single bug away from a cross-tenant read.

## Why the API role is narrow

`RuntimeStack.apiRole` is reachable from a process that accepts arbitrary merchant input and
serves untrusted website visitors. Anything it can do is something an application bug can
eventually be made to do.

Scoping decisions worth not undoing:

- **Inference is enumerated per model.** Nova Pro and Nova Lite for chat, Titan Embed as a
  separate statement. The split is not cosmetic — it means a bug in the ingestion path cannot
  reach the chat model, and vice versa.
- **No `bedrock:RetrieveAndGenerate`, and now no Bedrock retrieval at all.** That API handed
  prompt construction to Bedrock, taking our system prompt — and its injection defences — out
  of our control. Crawled site content is untrusted; see
  [docs/security.md](../docs/security.md). Prompt assembly stays in our code.

Transcribe, Polly, and Chime use `*` resources because none of them support resource-level
permissions — there is no ARN for a synthesis request. That is an AWS limitation, not an
oversight.
