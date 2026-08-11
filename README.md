# Voomate — Voice-First AI Agent Platform

A multi-tenant SaaS that replaces the standard website chat widget with a **voice-first AI
agent**. A merchant signs up, points us at their website, we learn it, and they embed one
script tag. Their visitors then *talk* to a grounded, low-latency agent in their own
language — with text as a fallback, not the main event.

> Status: **foundation**. The codebase is scaffolded, typed, and internally consistent.
> No external service is connected yet — Supabase and AWS get wired in the next phase.
> Every integration point is a named, validated slot rather than a stub scattered inline.

## Repository layout

```
apps/
  api/          Fastify control-plane API — tenants, agents, knowledge, sessions
  dashboard/    Next.js merchant dashboard (the product surface customers log into)
  widget/       Embeddable widget: tiny loader + isolated iframe app
packages/
  core/         Shared types, zod contracts, error taxonomy, env validation
  i18n/         Language registry — the 10 launch languages, voices, STT/code-switching
  db/           Multi-tenant Postgres schema (Drizzle) + Row Level Security policies
  config/       Shared tsconfig presets
infra/          AWS CDK stacks (defined, not deployed)
docs/           Architecture, ADRs, language matrix
```

## Getting started

```bash
npm install
cp .env.example .env     # fill in as services get connected
npm run check            # format + lint + typecheck across all workspaces
```

Nothing in the foundation phase requires AWS or Supabase credentials to typecheck or build.

## Where to read next

| Document | What it covers |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | System design, data flow, the voice pipeline |
| [docs/languages.md](docs/languages.md) | The 10 launch languages, code-switching, voice quality tiers |
| [docs/security.md](docs/security.md) | Tenant isolation, prompt injection, widget trust boundary |
| [docs/roadmap.md](docs/roadmap.md) | Phased delivery plan and what "done" means per phase |
| [docs/adr/](docs/adr/) | Architecture decision records — why each major choice was made |
