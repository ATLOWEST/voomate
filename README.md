# Voomate

Voomate is a multi-tenant AI agent platform for small and medium businesses. A merchant can
configure a governed Web Agent, connect approved business data, and embed a customer-facing
assistant on its website. The project is built around a simple principle: agents should be useful
without receiving unrestricted data access or unreviewed permissions.

## Why I built Voomate

I have always been obsessed with one question: **how can technology work for people, instead of
making people work around technology?** That question led me to build Voomate.

Voomate is an AI-powered operating system built around multiple intelligent agents. The goal is not
another chatbot: agents should understand a request, use the right approved context or capability,
and help complete real work across a business workflow.

The first released agent is the **Web Agent**—an AI assistant that lives directly inside a website
or product as a widget. It can answer grounded questions, explain the current page, guide visitors,
navigate them to verified destinations, and use explicitly approved, tenant-scoped capabilities for
live information such as product availability or a verified order status.

The platform is designed to grow beyond one agent. Each additional agent must use the same
governed catalog, connection, lifecycle, policy, and audit contracts so the system stays useful,
safe, and accountable as it expands.

> Current status: the Web Agent loop is deployed with grounded text and browser voice, website
> knowledge retrieval, governed live-read connections, controlled order status, and a merchant
> Operating Panel. Later catalog agents and write workflows remain intentionally gated; see the
> [roadmap](docs/roadmap.md) for the honest release boundary.

## What is implemented

- A TypeScript monorepo with a Next.js dashboard, Fastify control-plane API, embeddable Web
  Component, shared contracts, and AWS CDK infrastructure definitions.
- Tenant-scoped Supabase/Postgres data, Row Level Security policies, Drizzle schema and migrations.
- Website ingestion: sitemap and robots discovery, rendered extraction, sanitisation, semantic
  chunking, pgvector retrieval, grounded citations, and merchant content controls.
- Amazon Bedrock-powered agent orchestration with structured validation, bounded tools, audit
  records, and evaluation scripts.
- A Web Agent with streaming text and browser voice, image attachments, controlled order-status
  lookup, deterministic page assistance, and safe client navigation.
- Plug-and-play server integration contracts: passive page manifests for exact current-page
  awareness and named, tenant-bound capabilities for live product, price, and verified order reads.

## Architecture

The dashboard and widget are separate entry points: the dashboard is the merchant's Operating
Panel; the widget is the visitor-facing runtime. They meet at the governed control plane.

```text
Merchant Operating Panel                     Customer website
Next.js dashboard                            Voomate Web Component
        | configure and observe                      | origin-bound session
        +----------------------+--------------------+
                               v
                 Voomate control plane and Web Agent runtime
                               |
           +-------------------+-------------------+
           v                   v                   v
  tenant-scoped Postgres    RAG knowledge      controlled tools
  + RLS + lifecycle lease   ingestion/pgvector + policy + audit
           |                   ^
           +-------------------+
             crawl -> sanitise -> chunk -> embed -> retrieve
```

The complete architecture documents the merchant control flow, RAG pipeline, visitor turn,
controlled tool execution, tenant isolation, audit/evaluation loop, and the in-progress voice
path. Read the [architecture](docs/architecture.md), [security model](docs/security.md), and
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

Before opening a pull request, run:

```bash
npm run security:check
npm run check
npm test
```

The CI pipeline adds a production dependency audit and Python voice-service test/lint gate. GitHub
CodeQL scans TypeScript and Python on each pull request and weekly; Dependabot keeps npm, Python,
and workflow dependencies current. See [CONTRIBUTING.md](CONTRIBUTING.md) for the engineering and
security review standard.

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
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development, review, and tenant-safety standard |
| [Yug Patel - Software Engineer Intern Resume](docs/Yug_Patel_Software_Engineer_Intern_Resume.pdf) | Builder profile and verified project experience |
