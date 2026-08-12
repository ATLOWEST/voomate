# Voomate — Production Architecture Brief for Multi-Tenant Agentic SaaS

**Purpose of this document:** hand this directly to Claude Code as the engineering spec for building Voomate's core platform — designed to serve thousands of business clients (tenants) and their end-customers concurrently, with strict data isolation, high accuracy-through-escalation, and production-grade security and speed.

---

## 1. Multi-Tenancy & Data Isolation

**Requirement:** every business (tenant) and their customer data must be fully isolated from every other tenant, enforced at the database level, not just application code.

- Every table includes a `tenant_id` (business ID) column on every row.
- Enable **Row Level Security (RLS)** in Supabase/Postgres so isolation is enforced by the database itself, not just by application logic — a bug in application code cannot leak cross-tenant data.
- Every API request is authenticated to a specific `tenant_id`, and that ID is injected into every database query automatically via middleware — never trust a `tenant_id` passed directly from the client.
- Each tenant gets its own scoped API credentials for any third-party integration (WhatsApp, Razorpay, Calendar) so a leaked key only exposes one tenant.

---

## 2. Core Agent Runtime Architecture

**Six required components (do not ship without all six):**

1. **Model layer** — Claude (Sonnet for standard flows, escalate to a stronger model for complex reasoning). Model choice is configurable per tenant/tier.
2. **Tool registry** — typed, per-tenant, per-industry tool definitions (JSON schema), versioned so tools can be updated without breaking active conversations.
3. **Memory layer** — short-term (current conversation buffer, in-memory/Redis) + long-term (customer history, Postgres) + knowledge base (Supabase pgvector for RAG).
4. **Orchestrator** — the routing logic that decides: answer directly, call a tool, ask a clarifying question, or escalate to a human. Implement as a bounded loop (max N tool calls per turn) to prevent runaway execution.
5. **Observability layer** — full tracing of every decision, tool call, input, and output, tagged by `tenant_id` and `conversation_id`.
6. **Guardrail layer** — permission checks, confidence thresholds, and human-in-the-loop gates (detailed in Section 5).

---

## 3. Scaling for High Concurrent Traffic

**Requirement:** support thousands of simultaneous conversations across many tenants without manual capacity planning.

- Deploy conversation-handling logic as **serverless functions** (Vercel Functions or AWS Lambda) — each incoming message spins up an isolated, short-lived execution, scaling automatically with load; no fixed server capacity to provision.
- Use a **message queue** (e.g. AWS SQS or a Redis-backed queue) between incoming webhooks (WhatsApp, voice, chat) and the agent runtime, so traffic spikes are buffered rather than dropped.
- Separate the **voice pipeline** (Pipecat + Deepgram + Cartesia) onto dedicated always-warm infrastructure — voice needs low, consistent latency and doesn't tolerate serverless cold-starts well; text/chat can stay fully serverless.
- Horizontal database scaling: Supabase read replicas for high-read operations (knowledge base lookups) once volume requires it — not needed at launch, but design table structure now so it's not a rewrite later.

---

## 4. Speed Optimization

- **Response caching:** cache frequent, stable answers (FAQ-type queries) in Redis/Upstash, keyed by `tenant_id + normalized_query`, with a short TTL so updates to the knowledge base still propagate.
- **Model routing:** classify incoming queries by complexity before choosing a model — simple/FAQ queries route to a faster, cheaper model; multi-step or ambiguous queries route to a stronger model. Reduces both latency and cost at scale.
- **Parallel tool calls:** where the agent needs multiple independent pieces of information (e.g. checking both order status and customer history), issue those tool calls concurrently rather than sequentially.
- **Streaming responses:** stream partial text/voice output back to the user as it's generated, rather than waiting for the full response — critical for perceived speed in both chat and voice.

---

## 5. Accuracy & Reliability Design (not "100% accurate" — "knows its limits")

No production agent system claims 100% accuracy — the design goal is: **ground every answer in real data, and escalate confidently when uncertain**, rather than promising perfection.

- **RAG-grounded answers only** — the agent must never answer from model memory alone for business-specific facts; every factual claim is retrieved from that tenant's knowledge base first.
- **Confidence-based escalation** — define explicit triggers for human handoff: low retrieval-match confidence, repeated failed tool calls, customer explicitly requesting a human, or a query touching a guardrail-restricted action (refunds above a threshold, cancellations, etc.).
- **Evals pipeline** — maintain a growing dataset of real (anonymized) past conversations per tenant/industry as a regression test suite. Every change to prompts, tools, or models runs against this suite before deployment, catching accuracy regressions before they reach real customers.
- **Structured outputs** — enforce strict JSON schemas on all tool-calling outputs so downstream systems never receive malformed data.
- **Human-in-the-loop checkpoints** — irreversible or financially sensitive actions (refunds, cancellations, order modifications) require either explicit customer confirmation within the conversation, or a queued approval step for the business owner, before execution.

---

## 6. Security Architecture

- **Sandboxed tool execution** — the agent (LLM) never receives raw database credentials or direct API access. It can only request a tool call; a controlled internal API layer validates permissions and executes it. This prevents a bad model decision from directly damaging any system.
- **Per-tenant scoped credentials** — every third-party integration (Razorpay, WhatsApp, Calendar) is connected with tenant-specific, narrowly-scoped API keys, rotated on a schedule.
- **Rate limiting & anomaly detection** — cap tool-call volume and API usage per tenant per minute/hour; flag and throttle abnormal spikes automatically (both for cost control and abuse prevention).
- **Full audit logging** — immutable logs of every tool call, its inputs, its result, and which tenant/conversation triggered it — required both for debugging and for eventual compliance needs as you scale to larger clients.
- **Encryption** — all data encrypted in transit (TLS) and at rest (standard Supabase/Postgres encryption); no plaintext storage of payment details (delegate to Razorpay/Stripe's own vaulting, never store card data yourself).

---

## 7. Recommended Stack Summary (as of Aug 2026)

| Layer (role in the flow) | What it needs to do |
|---|---|
| Reasoning layer | Interprets the customer's message, decides whether to answer directly or call a tool, and generates the final response |
| Backend / request layer | Receives incoming messages from every channel, authenticates the tenant, and routes the request into the agent runtime |
| Data layer | Stores tenant data, customer records, and knowledge-base content, with tenant isolation enforced at the query level |
| Cache/queue layer | Buffers traffic spikes and serves frequent, stable answers instantly instead of re-processing them each time |
| Voice pipeline | Converts speech to text, runs it through the reasoning layer, and converts the response back to speech in real time |
| Telephony layer | Connects real phone numbers to the voice pipeline for inbound and outbound calls |
| Hosting layer | Runs the backend so it scales automatically with traffic, without manual capacity planning |
| Observability layer | Logs every decision and tool call per tenant/conversation, so behavior can be traced and debugged after the fact |

---

## 8. Instructions for Claude Code

When implementing this architecture:
1. Build multi-tenancy and Row Level Security FIRST, before any feature work — every table and query must be tenant-scoped from day one, since retrofitting isolation later is high-risk.
2. Implement the six-component agent runtime as a single reusable core, with the tool registry as data (not hardcoded logic), so new tools and new industries can be added without rewriting the runtime.
3. Build the guardrail/escalation layer before connecting any tool that touches money or irreversible actions.
4. Keep the initial deployment serverless and stateless wherever possible; only introduce dedicated infrastructure (for voice) where latency genuinely requires it.
5. Instrument logging and tracing from the first tool call, not as an afterthought — this is what makes debugging and eval-building possible later.
# Voomate — Service Overview

## What It Is
An AI agent platform that gives any small/medium business a working "AI employee" — handling customer conversations and real tasks across voice, web chat, and connected business tools. Built bootstrapped, from India, priced for global reach at low cost.

## Core Model
Every business account gets exactly **3 fixed AI agents** — not unlimited, not divided by industry:

1. **Voice Calling Agent** — answers and makes phone calls, books/reschedules, checks orders, escalates to a human when unsure. Inbound + outbound.
2. **Web Agent** — chat + voice widget on the business's own site. Takes real actions (redirect to a page, add to cart, check order, book a slot), not just Q&A.
3. **Integration Agent** — connects external tools (Google Calendar, Razorpay, WhatsApp, CRM) as sub-connections inside one agent slot; provides capabilities the other two agents can use.

## How They Work Together
Voice and Web agents can each connect to the Integration Agent (simple click-to-connect on the agent board) to gain real capabilities — e.g. Web Agent + Integration Agent (Calendar) = the widget can actually book a real appointment, not just describe how to.

## Universal, Not Industry-Locked
No industry presets or business-type selection. Each agent is configured from one shared tool library (Actions / Communication / Integrations) — the same three agents work for a clinic, restaurant, or shop; the owner just enables the tools relevant to them.

## Dashboard Features
- **Agent Board** — the 3 fixed agent cards, status, activity, connection state
- **Per-agent dashboard** — Overview, Conversations, Configuration, Knowledge Base, Logs, Settings
- **Conversations** — full transcript view with tool calls shown inline, separate from spoken/typed text
- **Usage** — minutes/messages used, cost, breakdown by agent
- **Integrations** — connect Calendar, Razorpay, WhatsApp, etc.

## Target Repetitive Tasks to Automate (roadmap)
Missed-call auto text-back, appointment scheduling, invoice/payment reminders, review requests, automatic CRM/data logging.

## Business Model
- Subscription / recurring revenue (SaaS), not one-off sales
- Self-serve, pay-as-you-go — no mandatory sales call, unlike enterprise competitors (Nugget, Yellow.ai)
- India-first pricing and languages, built to scale globally at lower cost than US-first competitors (Retell, Vapi, Chargebee-style tools)

## Design Principle
Real actions, not just answers — every agent is grounded in the business's real data (RAG) and can only take actions through defined, permission-scoped tools, with human handoff whenever confidence is low or the action is financially sensitive.