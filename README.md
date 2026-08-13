# Voomate — Voice-First AI Agent Platform

A multi-tenant SaaS that replaces the standard website chat widget with a **voice-first AI
agent**. A merchant signs up, points us at their website, we learn it, and they embed one
script tag. Their visitors then *talk* to a grounded, low-latency agent in their own
language — with text as a fallback, not the main event.

> Status: **first Web Agent loop connected**. The embeddable widget now uses the Next.js backend,
> Supabase/Postgres tenant data, Amazon Nova text + vision through Bedrock, pgvector retrieval,
> secure two-image attachments, a controlled order-status tool, versioned behavior evaluations,
> and non-blocking developer knowledge sync through `@voomate/connect`.
> Voice and additional tools remain later milestones.

## Repository layout

```
apps/
  api/          Fastify control-plane API — tenants, agents, knowledge, sessions
  dashboard/    Next.js merchant dashboard (the product surface customers log into)
  widget/       Legacy iframe widget (new Web Component ships from dashboard/public/embed.js)
packages/
  core/         Shared types, zod contracts, error taxonomy, env validation
  i18n/         Language registry — the 10 launch languages, voices, STT/code-switching
  db/           Multi-tenant Postgres schema (Drizzle) + Row Level Security policies
  connect/      Server SDK for stable-ID, hash-deduplicated knowledge pushes
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

## Run the complete Web Agent locally

```bash
npm run dev:web-agent
```

This health-checks and starts only the missing services, then keeps the complete dogfood path
available at:

- Public landing site with the installed widget: `http://localhost:3000`
- Authenticated dashboard and versioned widget assets: `http://localhost:3001`
- Connect/control API: `http://localhost:4000`

The landing site dogfoods the same public, domain-restricted `embed.js` integration that
clients install; it is not a second dashboard or a duplicate product implementation. The
`@voomate/connect` SDK and its secret key belong in a business's server, webhook, or deployment job
and must never be bundled into the landing site, dashboard, or widget.

## Where to read next

| Document | What it covers |
| --- | --- |
| [docs/agent-operating-system-north-star.md](docs/agent-operating-system-north-star.md) | Product doctrine, adaptive business learning, safe automation, and the 90-day execution plan |
| [docs/architecture.md](docs/architecture.md) | System design, data flow, the voice pipeline |
| [docs/languages.md](docs/languages.md) | The 10 launch languages, code-switching, voice quality tiers |
| [docs/security.md](docs/security.md) | Tenant isolation, prompt injection, widget trust boundary |
| [docs/web-agent-widget.md](docs/web-agent-widget.md) | Embed setup, behavior harness, evals, and smoke testing |
| [docs/connect-quickstart.md](docs/connect-quickstart.md) | Three-step secure SDK setup and public-field mapping |
| [docs/roadmap.md](docs/roadmap.md) | Phased delivery plan and what "done" means per phase |
| [docs/adr/](docs/adr/) | Architecture decision records — why each major choice was made |
