# Voomate Architecture

## Scope and status

Voomate is a multi-tenant AI agent operating system for small and medium businesses. The
implemented product is the **Web Agent**: merchants configure a governed agent in the Operating
Panel, connect approved knowledge and capabilities, then install a customer-facing web widget.

The same control-plane contracts are the foundation for the future CRM Tool, SEO, and Calling
Agent types. Those types are not represented as active production capabilities until their
runtime, policies, traces, and evaluation packs are released.

This page describes the current system. It intentionally separates working paths from planned
extensions.

## System map

The product has two independent entry points. The merchant dashboard controls and observes the
system; the website widget serves a visitor. Neither starts "inside" the other.

```text
 Merchant Operating Panel                         Customer website
 Next.js dashboard                                Versioned Web Component
        |                                                  |
        | configure, publish, inspect                     | origin-bound session
        v                                                  v
 +----------------------+                      +-----------------------+
 | Voomate control      |<---------------------| Web Agent runtime     |
 | plane                |  signed session      | Next.js route layer   |
 | Fastify + Next.js    |                      +-----------+-----------+
 +----------+-----------+                                  |
            |                                              | grounded turn
            |                                              v
            |                                   +-----------------------+
            |                                   | AI coordination        |
            |                                   | harness + Nova         |
            |                                   | allowed tools only     |
            |                                   +----+-------------+----+
            |                                        |             |
            v                                        v             v
 +----------------------+               +----------------+  +------------------+
 | Supabase Postgres    |               | RAG retrieval  |  | Controlled tools |
 | RLS + Drizzle        |               | pgvector       |  | policy + audit   |
 | org, agent, sessions |               +----------------+  +------------------+
 +----------+-----------+                        ^                 |
            ^                                    |                 |
            |                          indexed knowledge            |
            |                                    |                 |
            +----------------------+-------------+-----------------+
                                   |
                    crawl -> sanitise -> chunk -> embed -> store
```

## 1. Merchant control-plane flow

The Operating Panel is the merchant's source of control, not part of a visitor conversation.

```text
sign in -> organization -> create Web Agent in draft
        -> configure knowledge, appearance, allowed origins, and approved tools
        -> install the Voomate script on the merchant website
        -> Voomate verifies the live domain and indexes at least one knowledge source
        -> activate the agent -> issue a short-lived execution lease
        -> inspect conversations, traces, usage, quality signals, and audit events
```

Every agent instance has an organization, stable agent ID, catalog type, configuration revision,
policy state, tool grants, and audit history. Its lifecycle is enforced as:

```text
draft -> active <-> paused -> archived
```

An inactive, paused, or archived agent cannot serve new work. Archiving revokes execution leases,
keys, connections, and tool grants before retention-based deletion is considered. Activation also
requires a verified website origin and indexed knowledge, preventing an empty or unverified agent
from being publicly deployed.

## 2. Knowledge ingestion and RAG flow

RAG is not a generic document upload. Voomate builds a tenant- and agent-scoped knowledge index
from approved merchant content.

```text
merchant supplies site URL, manual Q&A, or managed content
  -> sitemap and robots discovery
  -> rendered page extraction for JavaScript sites
  -> remove navigation noise and hidden text; flag unsafe instruction patterns and credential-like values
  -> semantic chunking with source metadata
  -> Amazon Titan embedding generation
  -> Supabase Postgres knowledge rows + pgvector index
  -> retrieval scoped by organization ID and agent ID
  -> grounded response with source citations, or an explicit ungrounded result
```

The source page is treated as untrusted data. Retrieved text is never granted tool permissions and
is not treated as system instructions. A future re-crawl reuses the same controlled ingestion path
instead of writing directly to the model context.

## 3. Customer conversation flow

The website widget is a thin, versioned client. It does not receive database, AWS, or merchant
credentials.

```text
visitor opens widget
  -> public embed key + server-side origin validation
  -> short-lived, agent-scoped session token
  -> validate active lifecycle, configuration revision, and execution lease
  -> load bounded conversation history, page context, and active agent configuration
  -> embed visitor question and retrieve relevant tenant knowledge from pgvector
  -> select Nova model based on the request and stream the response
  -> optionally request an explicitly allowed tool through the execution harness
  -> store the answer, citations, run events, usage, and audit evidence
  -> stream the customer-safe response back to the widget
```

The agent has a bounded reasoning loop. It can use approved knowledge and only the tools enabled
for that tenant and agent; it cannot create tools, invent permissions, query arbitrary databases,
or call arbitrary URLs. Repeated unanswered questions and stuck tool loops use a safe escalation
path rather than falsely claiming completion.

## 4. Controlled live-data and tool flow

The current Web Agent includes a controlled order-status capability. It demonstrates the required
contract for every later business tool.

```text
model requests a named tool
  -> input validated with a typed schema
  -> tenant and agent tool grant checked
  -> scoped business lookup executes with verified customer fields
  -> allowlisted public result is returned to the model and visitor
  -> masked inputs, filtered output, status, and latency are written to the audit trail
```

The model never receives raw database credentials, internal notes, costs, or unrestricted record
access. Tool authorization errors fail closed. Higher-risk actions stay behind explicit approval
and verification gates.

## 5. Trust, isolation, and observability flow

Voomate applies several boundaries to every request instead of relying on one control:

```text
organization + agent scope
  -> application TenantContext
  -> Postgres Row Level Security
  -> signed, short-lived session and execution lease
  -> origin and deployment verification
  -> rate limits for access, turns, and uploads
  -> validation, policy checks, output filtering, and audit logging
```

Operational records are also scoped: conversations, knowledge sources, chunks, tool audit logs,
run events, usage records, connections, and agent configuration remain within the merchant's
organization and agent boundary. Logs record the evidence needed to investigate a turn without
exposing provider credentials or unrestricted customer data.

## 6. Quality and improvement flow

The system does not silently rewrite its production behavior from conversations.

```text
customer feedback + stored run evidence
  -> offline evaluation and regression cases
  -> review of prompts, knowledge, or policy changes
  -> versioned harness/configuration update
  -> controlled deployment and new trace evidence
```

The project includes automated tests, smoke scripts, and model-evaluation workflows. Evaluation
can identify weak grounding, tool choice, tone, or directness, but it cannot independently grant a
permission or promote a policy.

## 7. Voice path: in active development

Voice uses the same tenant, session, conversation, RAG, tool, and audit contracts as text. The
planned operational path is:

```text
microphone -> WebRTC voice service -> streaming transcription
           -> shared Web Agent runtime -> RAG and controlled tools
           -> streamed answer -> sentence-level speech synthesis -> browser playback
```

Text remains available throughout voice interaction. Voice deployment and real-world bilingual
validation are still in progress; this is not presented as a fully released production channel.

## Repository boundaries

| Area | Responsibility |
| --- | --- |
| `apps/dashboard` | Next.js Operating Panel, embed assets, and current Web Agent routes |
| `apps/api` | Fastify control-plane modules, tenancy, agents, ingestion, and shared services |
| `apps/widget` | Legacy widget compatibility surface |
| `services/voice` | Voice-service development path |
| `packages/core` | Shared TypeScript contracts, Zod schemas, lifecycle and error types |
| `packages/db` | Drizzle schema, migrations, scoped retrieval, and RLS policies |
| `packages/connect` | Server SDK for controlled, deduplicated knowledge pushes |
| `infra` | AWS CDK infrastructure definitions |

Read the [security model](security.md), [Web Agent intelligence design](web-agent-intelligence.md),
and [roadmap](roadmap.md) for implementation controls, detailed turn behavior, and honest delivery
status.
