# Architecture

## What we're building

A multi-tenant SaaS. Merchants sign up, point us at their website, we learn it, and they drop
one script tag on their site. Their visitors then talk to a grounded, low-latency voice agent.

Three surfaces, one backend:

| Surface | Audience | Job |
|---|---|---|
| **Dashboard** (`apps/dashboard`) | Merchants — site owners, developers | Onboard, curate knowledge, configure the agent, get the embed snippet, read analytics |
| **Widget** (`apps/widget`) | End visitors on merchant sites | Talk (or type) to the agent |
| **Control plane** (`apps/api`) | Neither — it's the machinery | Tenancy, auth, ingestion, voice orchestration, guardrails, billing |

## System diagram

```
┌─────────────────┐        ┌──────────────────┐
│    Dashboard    │───────►│   Control API    │──────► Supabase Postgres
│   (Next.js)     │  REST  │   (Fastify)      │        (tenants, agents, config,
└─────────────────┘        └────────┬─────────┘         conversations, usage)
                                    │
                                    ├──► Ingestion pipeline (Fargate)
                                    │      crawl → extract → chunk → S3
                                    │      → Bedrock Knowledge Base
                                    │        (OpenSearch Serverless vectors)
                                    │
┌─────────────────┐                 │
│  Widget (iframe)│                 ▼
│  on merchant    │◄──── WebRTC ──── Voice Orchestrator (Fargate)
│  site           │   (Chime SDK)         │
└─────────────────┘                       ├──► Transcribe streaming  (ears)
                                          ├──► Bedrock Nova Pro + KB (brain)
                                          └──► Polly streaming       (mouth)
```

## The voice pipeline — where this product is won or lost

A voice agent feels cheap the moment round-trip latency exceeds ~1.2s, or when you can't
interrupt it. Everything below exists to serve those two properties.

**Target: < 1.2s** from end-of-user-speech to first audible syllable.

The whole path must be **streaming end-to-end**. Any single request/response hop blows the
budget on its own.

```
visitor speaks
   │
   ├─ 1. Client VAD detects speech, opens the turn
   ├─ 2. Chime SDK carries audio (WebRTC: jitter buffer, echo cancel, packet loss recovery)
   ├─ 3. Transcribe streaming emits PARTIAL transcripts while they're still talking
   ├─ 4. Endpoint detection closes the turn
   ├─ 5. Bedrock KB retrieval  ─┐
   ├─ 6. Nova Pro streams tokens ┘ (speculative: can start on stable partials)
   ├─ 7. Sentence chunker cuts the token stream at clause boundaries
   ├─ 8. Polly synthesises EACH SENTENCE as it completes
   └─ 9. First sentence plays while later ones are still being generated
```

Step 8 is the one people get wrong. Waiting for the full LLM response before synthesising
turns a 400ms perceived latency into 2.5s. We synthesise per sentence and start playback on
the first one.

### Barge-in

Non-negotiable for a natural feel. Client-side VAD detects the visitor speaking over the
agent, and we immediately: stop playback, flush the Polly queue, cancel in-flight synthesis,
truncate the assistant turn in history at what was *actually heard* (not what was generated),
and reopen the mic. That history truncation matters — if the agent "remembers" saying
something the visitor never heard, the conversation desynchronises.

### Latency budget

| Stage | Target |
|---|---|
| Network (WebRTC, regional) | 50–150ms |
| Transcribe partial → final | 100–300ms |
| Retrieval (Bedrock KB) | 100–250ms |
| Nova Pro first token | 200–400ms |
| Polly first audio chunk | 100–200ms |
| **Total to first syllable** | **< 1.2s** |

Instrument every stage from day one. You cannot optimise a pipeline you can't see, and
"it feels slow" is not a debuggable report.

## Why Chime SDK over raw WebSockets

WebSockets are simpler and would work for a demo. Chime SDK gives us jitter buffering, echo
cancellation, packet-loss concealment, and network adaptation as managed features — all of
which matter enormously for visitors on patchy mobile networks, which is most of our target
markets. Echo cancellation alone is a substantial engineering project to do properly, and
without it, barge-in detection triggers on the agent's own voice.

Cost: it's a heavier lift (session management + a server-side media pipeline). So it lands in
Phase 3, deliberately **after** knowledge quality is proven over text.

See [adr/0002-webrtc-chime-transport.md](adr/0002-webrtc-chime-transport.md).

## Knowledge pipeline

```
URL → sitemap/robots discovery → Playwright render (JS-heavy sites are the norm)
    → readability extraction (strip nav/footer/cookie banners)
    → semantic chunking → S3 → Bedrock Knowledge Base ingestion
    → OpenSearch Serverless vectors
```

We use **Bedrock Knowledge Bases** rather than hand-rolling retrieval. It handles chunking,
embeddings, retrieval, and — critically — **citations**, which merchants need to trust the
output. Nova Pro integrates with it natively.

Merchants layer their own content on top of the crawl: manual Q&A pairs, uploaded documents,
and per-page include/exclude. Scheduled re-crawls keep it fresh.

**Retrieved content is untrusted input.** A merchant's own page can contain text that reads
like an instruction. It is passed to the model as *data*, never as instructions — see
[security.md](security.md).

## Multi-tenancy

Tenant isolation is enforced at **three** layers, deliberately redundant:

1. **Database** — Row Level Security on every tenant table. Even a query with a missing
   `WHERE` clause cannot cross tenants.
2. **Application** — every request carries a resolved `TenantContext`; repositories require it.
3. **AWS resources** — per-tenant Bedrock Knowledge Base, S3 prefix isolation.

RLS is the backstop that makes the other two layers' bugs non-catastrophic. The API's service
role bypasses RLS by design, which is exactly why the application layer must never construct
a query without a tenant scope. See [packages/db/README.md](../packages/db/README.md).

## Technology choices

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One language across API, dashboard, widget; shared contracts |
| API | Fastify | Mature, fast, first-class schema validation, good plugin ecosystem |
| Dashboard | Next.js (App Router) | Server components, mature, good hosting story |
| DB | Supabase Postgres | Managed Postgres + auth + RLS in one; RLS is central to our isolation model |
| ORM | Drizzle | Type-safe queries *and* SQL migrations; SQL stays readable |
| Validation | Zod | One schema shared between API and dashboard |
| Brain | Bedrock Nova Pro | Chosen stack; native Bedrock KB integration |
| RAG | Bedrock Knowledge Bases | Managed chunking/embedding/retrieval with citations |
| STT | Transcribe streaming | Streaming + multi-language code-switching |
| TTS | Polly (Generative) | Bilingual voices are decisive for the India market |
| Media | Chime SDK (WebRTC) | Jitter/echo/loss handling we'd otherwise build ourselves |
| Infra | AWS CDK | Infrastructure as code in TypeScript |

## Repository layout

```
apps/
  api/           Fastify control plane
    src/
      modules/   Feature-sliced: agents/, knowledge/, conversations/, ...
      plugins/   Cross-cutting: auth, tenancy, error handling, rate limits
      lib/       Infrastructure adapters (AWS clients, Supabase)
  dashboard/     Next.js merchant dashboard
  widget/        loader/ (tiny, on merchant page) + app/ (iframe)
packages/
  core/          Types, zod contracts, error taxonomy, env validation
  i18n/          Language registry — the verified AWS capability matrix as code
  db/            Drizzle schema + RLS policies + migrations
  config/        Shared tsconfig presets
infra/           CDK stacks
```

`packages/core` holds no business logic and no I/O — it's the contract layer every other
workspace depends on, so it must stay dependency-light and side-effect free.

## What is deliberately deferred

Naming these keeps the foundation honest about its own boundaries:

- **Human handoff** — escalation to a live agent. Schema anticipates it (`conversations.status`
  includes `escalated`); no integration built.
- **Billing** — `usage_records` is written from day one so metering is accurate retroactively.
  No Stripe wiring yet.
- **SSO / SCIM** — enterprise tier, post-launch. The `organization_members` role model is
  shaped to accept it.
- **Multi-region** — single region at launch. Region is threaded through config rather than
  hardcoded, so this is a deployment change, not a rewrite.
