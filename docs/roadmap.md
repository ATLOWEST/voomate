# Roadmap

Sequenced on one principle: **prove knowledge quality over text before adding real-time media
complexity.** A wrong answer delivered in a beautiful voice is worse than a wrong answer in
text — it's more convincing. Voice amplifies whatever the brain does, including its mistakes.

---

## Phase 0 — Foundation ← *we are here*

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

## Phase 1 — Connect services

- [ ] Supabase project; migrations applied; RLS verified with cross-tenant read attempts
- [ ] Supabase Auth wired: signup, login, org creation, invites
- [ ] AWS account, IAM roles, CDK deployed to dev
- [ ] Nova Pro reachable through Bedrock; utility model wired for background jobs
- [ ] Dashboard authenticates against real API with real tenancy

**Done means:** a real user signs up, gets an org, and sees an empty dashboard backed by a
real database with isolation proven by test.

## Phase 2 — Text MVP (the brain)

The highest-risk phase. Everything after it depends on retrieval quality being good.

- [ ] Crawler on Fargate: sitemap discovery, Playwright render, readability extraction
- [ ] Ingestion sanitisation — including hidden-text stripping (see security.md)
- [ ] Per-tenant Bedrock Knowledge Base provisioning
- [ ] RAG loop with citations; grounding refusal when retrieval is weak
- [ ] Onboarding wizard: URL → live crawl progress → playground
- [ ] Knowledge management UI: sources, manual Q&A, include/exclude, re-crawl
- [ ] Embeddable **text** widget, domain-allowlisted
- [ ] Cross-lingual retrieval measured per language pair

**Done means:** a merchant onboards their real site and gets correct, cited answers — and the
agent says "I don't know" instead of inventing one. Measure this before proceeding.

## Phase 3 — Voice

- [ ] Chime SDK session management + server-side media pipeline on Fargate
- [ ] Transcribe streaming, incl. `identify-multiple-languages` for code-switching
- [ ] Sentence-chunked Polly synthesis with per-sentence playback
- [ ] Barge-in: client VAD, playback abort, queue flush, history truncation at heard-point
- [ ] Voice widget UI: waveform, mute, interrupt, live transcript
- [ ] Per-stage latency instrumentation; tune to < 1.2s first syllable
- [ ] Hinglish validated end to end on the bilingual Kajal path

**Done means:** a conversation in Hinglish that a native speaker calls natural, interruptible,
and fast.

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
