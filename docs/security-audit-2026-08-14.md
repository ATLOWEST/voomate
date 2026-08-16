# Security Audit - 2026-08-14

## Executive summary

This review covered the API, dashboard Web Agent routes, widget session boundary, Connect SDK,
tool execution harness, voice service, database/RLS, infrastructure definitions, secrets handling,
and JavaScript/Python dependency trees.

The audit found exploitable request-authentication and tenant-authorization weaknesses. The
confirmed issues listed under **Remediated** were fixed and tested during the audit. This is not a
claim that the product is impossible to compromise. The items under **Production blockers** must
remain visible release criteria.

## Remediated

### Critical - unsigned WhatsApp webhook ingestion

The public webhook trusted caller-supplied organization and agent IDs and accepted unsigned JSON.
It now verifies the exact raw body with HMAC-SHA256 using a 32+ character secret, uses constant-time
comparison, caps the body at 256 KiB, validates a strict schema, rate limits delivery, and resolves a
published agent by both organization and agent ID before queueing work.

### High - tool execution could occur before durable audit

The Secure Execution Harness previously executed a tool before writing its audit row. It now writes
a durable authorization intent before crossing the execution boundary and blocks execution if that
write fails. A second immutable receipt records the outcome. Tool input and output are bounded and
credential-shaped audit fields are redacted.

### High - tools were not bound to effective agent permissions

The runtime now independently checks all of the following before execution:

- the agent belongs to the organization and is published;
- the conversation belongs to the same organization and agent;
- a non-built-in tool has an active grant for that exact agent;
- a provider-backed tool has an active integration for the same organization;
- input passes a strict schema;
- placeholder/mock tools are never exposed to the model or executed.

The legacy simulated booking, payment, CRM, and commerce tools are marked as placeholders. They can
no longer produce fake production success.

### High - tenant policy drift was not detectable

Several newer tenant tables had RLS enabled but not forced and had no applied policies. The policy
set now covers every public table carrying `organization_id`, including tool grants, tool audit
receipts, integrations, knowledge gaps, approval requests, agent connections, and read-only
connections. Manual policy migrations run atomically so a syntax error cannot leave policies
dropped halfway through an update.

The verifier now discovers tenant tables from PostgreSQL's catalog rather than trusting a manually
maintained test list. It checks enabled RLS, forced RLS, explicit policy presence, cross-tenant read
and write behavior, tool-grant isolation, audit-log isolation, and direct credential invisibility.

### High - visitor resource ownership gaps

Image signing and voice event ingestion now bind a supplied conversation to organization, agent,
and the hashed visitor session. A valid widget token from one browser session cannot operate on a
different visitor's conversation.

### Medium - JWT and reverse-proxy trust

Supabase access tokens now require the expected issuer and `authenticated` audience in addition to
signature and algorithm validation. Reverse-proxy trust is disabled by default and can only be
enabled for explicit CIDRs, preventing a direct caller from spoofing `X-Forwarded-For` to evade IP
rate limits.

### Medium - SSRF address coverage

The Connect SDK now rejects loopback, private, link-local, carrier-grade NAT, benchmark, reserved,
multicast, and IPv4-mapped IPv6 destinations. Invalid IP values fail closed. Redirects remain
manually validated at every hop.

### Medium - browser and supply-chain baseline

The dashboard now sends anti-framing, MIME-sniffing, HSTS, referrer, permissions, object, and
cross-domain-policy headers. Production npm dependencies report zero known vulnerabilities. The
voice lockfile reports zero known vulnerabilities after upgrading `pytest` and `pytest-asyncio`.

## Verification evidence

- API security tests: 11 passed (webhook signature, harness authorization/audit, JWT claims).
- Connect SDK tests: 16 passed, including private/reserved destination rejection.
- Voice service: 15 tests passed; Ruff passed.
- Database: 63/63 RLS checks and 10/10 scoped retrieval checks passed against the configured DB.
- Production JavaScript audit: 0 known vulnerabilities.
- Python lock audit: 0 known vulnerabilities.
- High-confidence current-tree and full-git-history secret patterns: none found.
- Full workspace typecheck, tests, and production build passed. Security-scope ESLint passed with
  zero errors. Repo-wide ESLint still reports 82 errors in pre-existing dashboard, landing, script,
  and legacy orchestration files; generated/vendor paths are now correctly excluded.

## Production blockers and residual risk

1. **Provider credential vault.** `organization_integrations.credentials` is a legacy JSON column.
   Provider tools remain disabled placeholders. Do not enable a real provider tool until credentials
   are envelope-encrypted with KMS or stored as secret-manager references, with rotation and
   revocation tested.
2. **Network-level SSRF control.** DNS validation followed by a normal fetch has a DNS-rebinding
   time-of-check/time-of-use window. Production Connect traffic needs an egress proxy/firewall with
   destination allow rules, or a dispatcher pinned to the validated IP while preserving TLS host
   verification.
3. **Webhook replay protection.** HMAC proves authenticity, not freshness. The provider adapter must
   persist provider event IDs with a uniqueness constraint and reject already-processed deliveries.
4. **Development dependency findings.** `npm audit` still reports 13 transitive findings beneath
   `promptfoo` and `drizzle-kit`. They are not in production dependency trees. Run these tools only
   in isolated CI/developer environments and upgrade when their upstream fixes are compatible; do
   not use the audit tool's proposed breaking downgrades.
5. **Secret operations.** Production must supply independent high-entropy secrets, explicit proxy
   CIDRs, automated rotation, least-privilege IAM task roles, and alerting on authentication,
   authorization, low-confidence voice, and audit-receipt failures.
6. **Independent validation.** Run DAST against a production-like deployment and commission an
   external penetration test before processing real customer data or enabling write-capable tools.
7. **Restore the lint gate.** Resolve the 82 pre-existing source lint errors so CI can make
   repo-wide lint a required check instead of relying on security-scope lint during this audit.

## Reference baseline

The review uses OWASP ASVS 5.0 as the application-control checklist and the OWASP SSRF and Secrets
Management cheat sheets for network and secret-lifecycle controls.
