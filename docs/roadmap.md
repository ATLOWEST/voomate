# Roadmap

Sequenced on one principle: **prove knowledge quality over text before adding real-time media
complexity.** A wrong answer delivered in a beautiful voice is worse than a wrong answer in
text — it's more convincing. Voice amplifies whatever the brain does, including its mistakes.

---

## Phase 0 — Foundation ✅

Scaffolding, contracts, and schema. No external service connected.

- [x] Monorepo, TypeScript config, lint/format, validated env contract
- [x] Verified AWS language capability matrix → `packages/i18n`
- [x] Shared types, zod contracts, error taxonomy → `packages/core`
- [x] Multi-tenant schema + RLS policies → `packages/db`
- [x] API skeleton: plugins, tenancy, module structure
- [x] Dashboard shell: design system, routes, layout
- [x] Widget skeleton: loader + iframe app + postMessage protocol
- [x] CDK stack definitions

**Done means:** `npm run check` passes clean; every integration point is a named, typed slot.

## Phase 1 — Connect services ✅

- [x] Supabase project; migrations applied; RLS verified with cross-tenant read attempts
- [x] Supabase Auth wired: signup, login, org creation, invites
- [x] AWS account, IAM roles — CDK stacks written, **not yet deployed** (needs `cdk deploy`)
- [x] Nova Pro reachable through Bedrock; utility model wired for background jobs
- [x] Dashboard authenticates against real API with real tenancy

**Done means:** a real user signs up, gets an org, and sees an empty dashboard backed by a
real database with isolation proven by test.

## Phase 2 — Text MVP (the brain) ✅

The highest-risk phase. Everything after it depends on retrieval quality being good.

- [x] Crawler: sitemap discovery, render, readability extraction (runs in-process for now;
      Fargate is a deployment change, not a code change)
- [x] Ingestion sanitisation — including hidden-text stripping (see security.md)
- [x] ~~Per-tenant Bedrock Knowledge Base~~ → **Supabase pgvector**, one table, RLS per tenant
      (ADR 0001 superseded — cheaper, no per-tenant provisioning, same embeddings)
- [x] RAG loop with citations; grounding refusal when retrieval is weak
- [x] Onboarding wizard: URL → live crawl progress → playground
- [x] Knowledge management UI: sources, manual Q&A, include/exclude, re-crawl
- [x] Embeddable **text** widget, domain-allowlisted
- [ ] Cross-lingual retrieval measured per language pair — **not measured**; the embedding model
      is multilingual and the path works, but there are no per-pair numbers

**Done means:** a merchant onboards their real site and gets correct, cited answers — and the
agent says "I don't know" instead of inventing one. Measure this before proceeding.

## Phase 3 — Voice ← *we are here*

Plan and build order: `docs/phase-3-voice.md`. Transport decision: `docs/adr/0006-*`.

- [x] ~~Chime SDK~~ → **raw WebSocket + 16 kHz PCM**, session state on the API
      (Chime is a meeting SDK; we have one visitor and one bot, and it costs per attendee-minute)
- [x] Transcribe streaming, incl. `identify-multiple-languages` for code-switching
- [x] Sentence-chunked Polly synthesis with per-sentence playback
- [x] Barge-in: server VAD on the transcript, playback abort, queue flush, history truncated at
      the heard-point
- [x] Voice widget UI: level meter, mute, interrupt, live transcript, text always available
- [x] Per-stage latency instrumentation — measured **1331 ms** end-of-speech → first audio out
      (target 1.2 s; the retrieval hop is the gap, see below)
- [ ] Hinglish validated end to end on the bilingual Kajal path — the code paths exist and are
      unit-tested; no real bilingual conversation has been run yet
- [ ] Deploy: the media pipeline still runs on a laptop, not on Fargate

**Done means:** a conversation in Hinglish that a native speaker calls natural, interruptible,
and fast.

**Where the 131 ms is:** the Supabase project is in Tokyo and everything else is in `us-east-1`
— 208 ms round trip on every retrieval. Moving the database to `us-east-1` is the single
largest latency win available and needs no code change.

## Phase 4 — Premium polish

- [ ] Full visual pass; motion system; loading and empty states throughout
- [ ] Branding: colours, logo, voice selection, avatar, position
- [ ] Conversation analytics: transcripts, resolution rate, drop-off, top unanswered questions
- [ ] Voice preview in merchant's own content, per language, before publish
- [ ] Prompt injection suite green against poisoned fixtures
- [ ] Accessibility: keyboard, screen reader, reduced motion, text fallback always reachable

**Done means:** it feels like a product people pay for, not a demo.

## Phase 5 — Scale & commercialise

- [ ] Usage metering → Stripe billing (records already written from Phase 1)
- [ ] Team roles, SSO/SCIM for enterprise
- [ ] Human handoff / escalation integrations
- [ ] Multi-region deployment
- [ ] Additional languages from the "free extras" tier
- [ ] SOC 2 readiness

---

## Sequencing rules

1. **No voice before retrieval is measurably good.** Non-negotiable.
2. **Instrument before optimising.** Latency work without per-stage numbers is guesswork.
3. **RLS verified by test, not by inspection.** Isolation bugs are existential for a SaaS.
4. **Every language ships with its quality tier disclosed.** Never silently degrade.
