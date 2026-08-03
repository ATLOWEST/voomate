# ADR 0001 — Use Bedrock Knowledge Bases instead of a self-managed vector store

**Status:** ~~Accepted~~ **Superseded by [ADR 0005](0005-supabase-pgvector.md)** · 2026-08-03

> Superseded on the "Revisit if" clause below. Measuring the AWS account in Phase 1 found a
> **hard, non-adjustable cap of 100 Knowledge Bases per account** — a per-tenant KB design stops
> selling at 100 merchants — alongside the anticipated OpenSearch cost floor (~$700/month idle).
> Retained unedited for the record; the reasoning below was sound given what was known on
> 2026-08-02, and the Titan Embed v2 choice survives into ADR 0005.

**Originally accepted:** 2026-08-02

## Context

The agent must answer from a merchant's website content. That needs chunking, embedding,
vector storage, retrieval, and citations. The obvious alternative is a self-managed stack
(pgvector in the Supabase Postgres we already have, or Pinecone/Qdrant) with our own
chunking and retrieval code.

## Decision

Use **Amazon Bedrock Knowledge Bases**, backed by OpenSearch Serverless, with one Knowledge
Base provisioned per tenant.

## Rationale

- Nova Pro is already the chosen brain and integrates with Bedrock KB natively — retrieval
  becomes part of the model call rather than a separate orchestration layer we maintain.
- **Citations are built in.** Merchants do not trust an AI that answers about their business
  without showing its sources, and citation plumbing is tedious to retrofit.
- Managed chunking and embedding removes a meaningful amount of code that would otherwise
  need tuning and ongoing maintenance.
- Per-tenant KBs give a hard isolation boundary at the AWS resource level, which is much
  easier to reason about than row-level filters in a shared index.
- Titan Embed Text v2 is multilingual, which our 10-language strategy requires for
  cross-lingual retrieval.

## Consequences

- **Vendor lock-in to Bedrock.** Accepted: we are already committed to Nova Pro, Polly, and
  Transcribe. This deepens an existing dependency rather than creating a new one.
- **Less control over chunking.** If retrieval quality proves insufficient in Phase 2, we can
  pre-chunk before handing documents to the KB, which recovers most of the control.
- **Per-tenant provisioning cost and latency** at onboarding. Needs to be an async job with
  visible progress, not a blocking step in the signup flow.
- **OpenSearch Serverless has a cost floor.** Monitor at low tenant counts; consider grouping
  small tenants if the economics don't work at the entry price point.

## Revisit if

Retrieval quality measures poorly in Phase 2 and pre-chunking doesn't close the gap, or the
per-tenant cost floor breaks the pricing model.
