# ADR 0005 — Retrieval on Supabase pgvector, not Bedrock Knowledge Bases

**Status:** Accepted · 2026-08-03 · **Supersedes [ADR 0001](0001-bedrock-knowledge-bases.md)**

## Context

ADR 0001 chose Bedrock Knowledge Bases with one KB provisioned per tenant, backed by a shared
OpenSearch Serverless collection. It closed with an explicit escape hatch:

> **Revisit if** … the per-tenant cost floor breaks the pricing model.

Connecting the AWS account in Phase 1 turned two of that ADR's assumptions into measurements,
and both came back worse than assumed.

### 1. Knowledge Bases per account is a hard cap of 100

```
$ aws service-quotas list-service-quotas --service-code bedrock
(Knowledge Bases) Knowledge bases per account   : 100    Adjustable: False
(Knowledge Bases) Concurrent ingestion jobs     : 5
```

`Adjustable: False` — this is not a limit-increase request, it is a ceiling. One KB per tenant
means **the product stops selling at 100 merchants**, and only 5 can onboard concurrently.

ADR 0001 treated per-tenant KBs as the isolation mechanism, so this is not a detail that can be
tuned away without also discarding that ADR's isolation story.

### 2. The cost floor is charged before the first customer

OpenSearch Serverless bills a minimum OCU allocation continuously, independent of traffic. A
VECTORSEARCH collection with the CDK default (`standbyReplicas` unset → enabled) floors at
roughly **$700/month**; ~$350 with standby disabled. That is charged from the moment the stack
deploys, with zero tenants and zero queries.

For a product whose tenants are individually idle most of the day, a fixed floor is the worst
possible cost shape.

## Decision

Store embeddings in the **Supabase Postgres instance we already run**, using **pgvector**, and
own the chunk → embed → retrieve loop ourselves.

- **Chunking and extraction:** ours, in the ingestion pipeline.
- **Embeddings:** Bedrock **Titan Embed Text v2** (1024 dimensions), called directly. This is
  the one part of ADR 0001's stack that survives — it was chosen for multilingual quality, and
  that reasoning is unaffected.
- **Storage:** a `knowledge_chunks` table, one row per chunk, `vector(1024)` column.
- **Retrieval:** an HNSW index and a `match_knowledge_chunks()` SQL function scoped by
  `agent_id` and `organization_id`.
- **Citations:** assembled by us from the chunk rows, which carry their source document and URL.

## Rationale

- **No ceiling.** Tenants become rows, not AWS resources. The cap moves from 100 accounts to
  whatever Postgres will hold, which is orders of magnitude beyond any plausible near-term need.
- **No idle floor.** Vectors sit in a database already paid for. The marginal cost of an idle
  tenant approaches zero, which is the cost shape the pricing model needs.
- **Isolation reuses a mechanism already proven here.** Every other tenant table is protected by
  RLS (ADR 0004), verified by a conformance test that iterates `TENANT_SCOPED_TABLES`. Chunks
  join that same list and inherit the same policy pattern and the same test. Under ADR 0001
  isolation depended on a *second*, unlike mechanism — per-resource AWS boundaries — that the
  RLS test could not see.
- **No per-signup provisioning.** ADR 0001 conceded that KB provisioning had to be an async job
  with visible progress. Inserting rows needs none of that; onboarding gets materially simpler.
- **Retrieval control we already wanted.** ADR 0001 accepted "less control over chunking" as a
  cost. Meanwhile `infra/README.md` and `docs/security.md` insist on `bedrock:Retrieve` over
  `RetrieveAndGenerate` precisely to keep prompt assembly — and its injection defences — in our
  hands. We were already committed to owning the prompt; we now own the chunking that feeds it.

## Consequences

- **We write and maintain the retrieval code.** Chunking strategy, embedding batching, and query
  construction are now ours to tune and to get wrong. This is the real cost of this decision, and
  it lands squarely in Phase 2 — which is already the phase the roadmap calls highest-risk.
- **Citations are hand-built.** Cheaper than it sounds: we control chunk boundaries, so a chunk
  already knows its document and URL. ADR 0001 rated built-in citations highly; we keep the
  capability and lose only the convenience.
- **Retrieval quality is now our measurement problem.** Nothing external is tuning recall. The
  roadmap's existing instruction to measure retrieval quality per language pair before starting
  voice becomes load-bearing rather than advisory.
- **Embedding cost is now explicit and per-token.** Previously buried inside KB ingestion. It
  should be metered into `usage_records` like any other consumable.
- **Postgres now carries the vector workload.** Vector search competes with transactional queries
  for the same instance. Watch it; a read replica or a dedicated instance is the escape valve.
- **AWS lock-in decreases.** Retrieval becomes portable. Inference, speech and transport remain
  on AWS, so this narrows an existing dependency rather than removing it.

## Alternatives considered

- **S3 Vectors.** Genuinely cheap and idle-friendly, and it would have kept Bedrock KB. Rejected
  because it solves only the cost half: it is still a KB-per-tenant design underneath, so the
  100-account ceiling and the second isolation mechanism both survive.
- **OpenSearch with `standbyReplicas: DISABLED`.** Halves the floor to ~$350/month and changes
  nothing structural. Rejected for the same reason — the ceiling is the disqualifying problem,
  not the price.
- **Aurora PostgreSQL Serverless v2** (a vector store Bedrock KB does support). Rejected as a
  second database to operate and pay for, when the first one already speaks pgvector.

## Revisit if

Vector search measurably degrades transactional query latency on the shared Postgres instance and
a read replica does not recover it; or retrieval quality plateaus below target and the ceiling on
recall proves to be our chunking rather than the embedding model.
