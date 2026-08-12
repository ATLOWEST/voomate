# ADR 0007 — Prefer developer-pushed knowledge; keep crawling as fallback

**Status:** Accepted · 2026-08-11

## Context

Website crawling is useful when a business has no developer access, but it is an external,
eventually consistent view. It can miss client-rendered content, be delayed or blocked, and spend
embedding tokens rediscovering unchanged pages after a deploy. Businesses with their own backend
already know when descriptive content changes and can provide it directly.

## Decision

Ship `@voomate/connect`, a server-only SDK that pushes content to `POST /v1/connect/sync`.

- Authentication uses a hashed, revocable tenant secret with the explicit `knowledge:write` scope,
  bound to one agent. Widget public keys are never accepted.
- The developer's stable `id` is the upsert identity. `type` is descriptive metadata and can change
  without creating a second stale item.
- Single updates and batches enter the existing `sanitize → chunk → Titan Embed → pgvector` pipeline.
  There is no second content or vector store.
- A normalized SHA-256 content hash skips unchanged items before Bedrock is called.
- A short per-item database claim prevents concurrent retries from embedding the same version twice.
- SDK retries are bounded and the returned promise always resolves. Voomate availability must never
  become an application or deployment failure for the customer.
- Website crawling remains available as a fallback for businesses without developer access.

## Consequences

- Developer-connected businesses get update-time freshness without waiting for a recrawl.
- Deploy hooks may safely resend complete content sets; unchanged items have zero embedding cost.
- Keys require lifecycle management (one-time display, least-privilege scope, revocation, and usage
  visibility).
- Batch processing is intentionally sequential at the endpoint so a deployment cannot starve live
  visitor inference of Bedrock quota.
- Mode B platform integrations can be added later without changing the endpoint or storage model.

