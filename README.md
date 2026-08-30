# Voomate

Voomate is a multi-tenant AI agent platform for small and medium businesses. A merchant can
configure a governed Web Agent, connect approved business data, and embed a customer-facing
assistant on its website. The project is built around a simple principle: agents should be useful
without receiving unrestricted data access or unreviewed permissions.

> Current status: the first Web Agent loop is implemented. It supports grounded text and voice
> interaction, website knowledge retrieval, a controlled order-status tool, and a merchant
> dashboard. Voice deployment and several later-stage capabilities remain in progress; see the
> [roadmap](docs/roadmap.md) for the honest release boundary.

## What is implemented

- A TypeScript monorepo with a Next.js dashboard, Fastify control-plane API, embeddable Web
  Component, shared contracts, and AWS CDK infrastructure definitions.
- Tenant-scoped Supabase/Postgres data, Row Level Security policies, Drizzle schema and migrations.
- Website ingestion: sitemap and robots discovery, rendered extraction, sanitisation, semantic
  chunking, pgvector retrieval, grounded citations, and merchant content controls.
- Amazon Bedrock-powered agent orchestration with structured validation, bounded tools, audit
  records, and evaluation scripts.
- A Web Agent with text fallback, image attachments, controlled order-status lookup, and an
  in-progress voice path using streaming speech services.

## Architecture

```text
Merchant dashboard / website widget
              |
              v
      Next.js + Fastify control plane
              |
              +--> tenant-scoped Postgres + RLS
              |
              +--> knowledge ingestion and pgvector retrieval
              |
              +--> Bedrock orchestration and controlled tools
              |
              +--> audit events, evaluations, and usage records
```

Read the full [architecture](docs/architecture.md), [security model](docs/security.md), and
[agent operating-system doctrine](docs/agent-operating-system-north-star.md) before extending an
agent or connection.

## Repository layout

```text
apps/
  api/          Fastify control plane: tenants, agents, knowledge and sessions
  dashboard/    Next.js merchant dashboard and embed assets
  landing/      Public product site
  widget/       Legacy iframe widget
packages/
  core/         Shared TypeScript types, Zod contracts and environment validation
  db/           Drizzle schema, migrations and Row Level Security policies
  connect/      Server SDK for stable-ID, hash-deduplicated knowledge pushes
  i18n/         Language and voice capability registry
infra/          AWS CDK definitions
docs/           Architecture decisions, security model and delivery plan
```

## Local development

Requirements: Node.js 22+ and npm. Copy `.env.example` to `.env`, then supply only the services
needed for the workflow you are running. Never commit `.env` files or provider credentials.

```bash
npm install
npm run check
npm run dev:web-agent
```

The Web Agent development command starts the available local services:

- Landing site: `http://localhost:3000`
- Merchant dashboard and widget assets: `http://localhost:3001`
- Control-plane API: `http://localhost:4000`

## Security and contribution notes

- Client bundles must never contain server credentials. Variables prefixed with `NEXT_PUBLIC_` are
  public by design.
- Every tenant-owned data path must retain organization and agent scope. RLS is a backstop, not a
  substitute for scoped application queries.
- Treat crawled pages and visitor input as untrusted data. They must not grant tool permissions or
  alter system instructions.
- Generated deployment output and local release packages are intentionally ignored. Rebuild them
  from source instead of committing duplicate artifacts.

Please report vulnerabilities according to [SECURITY.md](SECURITY.md). The project is not
security-certified; known pre-launch controls and remaining work are tracked in the
[security checklist](docs/security.md#pre-launch-checklist).

## Further reading

| Document | Purpose |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Service boundaries and data flow |
| [docs/security.md](docs/security.md) | Tenant isolation, prompt injection, secrets and widget trust boundary |
| [docs/roadmap.md](docs/roadmap.md) | Implemented milestones and honest release gaps |
| [docs/web-agent-widget.md](docs/web-agent-widget.md) | Widget setup, evaluations and smoke tests |
| [docs/connect-quickstart.md](docs/connect-quickstart.md) | Secure server SDK setup |
