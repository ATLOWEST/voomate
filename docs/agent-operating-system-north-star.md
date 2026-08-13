# Voomate Agent Operating System: North Star

**Status:** Authoritative product and engineering doctrine  
**Audience:** Founder, product, engineering, AI evaluation, security  
**Last reviewed:** 2026-08-13

This document defines what Voomate is trying to become, what it must not become, and the shortest
credible path from today's Web Agent platform to a trustworthy AI operating system for businesses.
Use it to judge new ideas, features, dependencies, and architectural changes.

## 1. The goal

Voomate gives a business one connected AI operating team through three fixed agents:

1. **Voice Calling Agent** for inbound and outbound phone conversations.
2. **Web Agent** for chat and voice inside the customer's website or application.
3. **Integration Agent** for approved access to business systems and actions.

Together they should understand how the business communicates, how its work moves, which systems
hold the truth, and which actions may be performed. They should help complete real work while the
business keeps control.

The desired customer outcome is not "we installed a chatbot." It is:

> "Our customer operations keep moving with less manual effort, and we can see, control, and trust
> every important decision the AI makes."

## 2. The product thesis

Small and medium businesses usually do not need more software surfaces. They need the tools they
already use to work together, customer requests to reach the right workflow, and repetitive work
to be completed safely.

Voomate therefore wins by doing five things well:

1. **Understand the business from evidence.** Learn from approved public knowledge, UI manifests,
   data schemas, connected-tool metadata, historical interaction samples, and confirmed outcomes.
2. **Turn understanding into an explicit operating profile.** The learned behavior must be visible,
   versioned, editable, and testable rather than hidden inside a prompt.
3. **Coordinate work across channels.** Web, voice, email, WhatsApp, and connected tools use the
   same customer context, policies, permissions, and workflow state.
4. **Act through governed workflows.** Reads are read-only. Writes are separately scoped,
   validated, approved when necessary, executed idempotently, verified, and logged.
5. **Improve from outcomes without self-modifying in production.** The system may propose a better
   workflow or response policy, but promotion requires evaluation and an approval gate.

## 3. What we are not building

These boundaries protect the company from expensive detours:

- Not an unlimited collection of customer-created agent personas.
- Not an autonomous multi-agent swarm that debates every request.
- Not an industry-preset product with separate clinic, restaurant, and shop architectures.
- Not a copy of the customer's employees or a system that impersonates an individual.
- Not a crawler with permanent access to the customer's complete source code, database, or inbox.
- Not a model with raw credentials, SQL access, arbitrary HTTP access, or permission to invent tools.
- Not a workflow canvas before repeated real workflows prove that one is necessary.
- Not online reinforcement learning that silently changes production behavior.
- Not a claim of perfect accuracy or fully autonomous operation.

Voomate may use short-lived internal roles such as planner, retriever, policy checker, executor,
verifier, and evaluator. These are stages in one trace, not additional customer-facing agents and
not independently privileged processes.

## 4. The core abstraction: Business Operating Profile

Every tenant gets one shared, versioned **Business Operating Profile (BOP)**. The three agents use
the same profile, filtered by their channel and permissions.

The BOP contains structured facts, not a giant generated prompt:

| Section | What it records | Example |
| --- | --- | --- |
| Identity | Public purpose and positioning | Who the business serves and why it exists |
| Communication | Approved tone and response habits | Concise, bilingual, formal greetings |
| Customer intents | Recurring requests and priority | Order status, reschedule, sales enquiry |
| Entities | Public business object shapes | Product, appointment, order, service |
| UI surfaces | Advertised pages and supported navigation | Pricing, account, bookings |
| Systems | Connected sources of truth | Gmail, WhatsApp, calendar, CRM |
| Capabilities | Named reads and controlled writes | `get_order`, `draft_reply`, `book_slot` |
| Workflows | Versioned state machines | Lead qualification, appointment booking |
| Policies | Business and safety rules | Refund window, prohibited claims |
| Escalation | When and where humans take over | Low confidence, angry customer, high value |
| Evaluation | Expected outcomes and thresholds | Correct tool, grounded reply, no leakage |

### Evidence and confidence

Every learned BOP field must retain:

- tenant and source;
- evidence type and source reference;
- extraction time and freshness;
- confidence score;
- inference method and version;
- review state: `observed`, `proposed`, `approved`, `rejected`, or `retired`;
- approver and change history when promoted.

An inferred field without evidence is a suggestion, never an operational fact.

### Conflict precedence

When sources disagree, use this order:

1. Security policy and legal restrictions.
2. Explicit owner-approved policy.
3. Current verified live data.
4. Approved workflow definition.
5. Approved operating-profile behavior.
6. Retrieved public knowledge.
7. Recently observed but unapproved patterns.

The model never resolves a permission conflict by itself.

## 5. How behavioral learning should work

Connecting Gmail or WhatsApp must not mean "read everything and copy the owner." It should start a
bounded, consented learning workflow.

### What to learn

From an approved sample of historical conversations, extract aggregate operating patterns:

- common customer intents and their frequency;
- greeting and closing conventions;
- preferred answer length and structure;
- formality, supported languages, and terminology;
- questions normally asked before an action;
- response-time expectations;
- escalation triggers and destination;
- which facts and systems are checked for each intent;
- which replies led to resolution, correction, or follow-up;
- phrases or promises the business avoids.

### What not to learn

- Passwords, tokens, payment details, health records, or unrelated personal conversations.
- Private facts merely because they appeared in an old message.
- A staff member's spelling mistakes, emotional reactions, or unsafe shortcuts.
- A write permission from evidence that a person previously performed that action.
- A policy from one example when an approved policy source exists.

### The learning loop

```text
approved connection
  -> bounded sample and data minimization
  -> PII/secret classification and redaction
  -> intent, style, workflow, and outcome extraction
  -> evidence-backed BOP proposals
  -> offline replay against historical cases
  -> owner review for material changes
  -> versioned promotion
  -> monitored rollout
  -> production feedback becomes new evaluation data
```

RLAIF belongs in the evaluation and proposal stages. It can score grounding, tone, tool choice,
policy compliance, and resolution quality. It must not grant permissions or directly rewrite the
active production policy.

### Gmail and WhatsApp example

Suppose the owner usually answers a delivery enquiry by greeting the customer, confirming the
order number, checking the commerce system, stating the status first, then sharing the next step.
Voomate should learn this as:

```yaml
intent: delivery_status
required_fields: [order_id, checkout_email]
read_capability: get_order_status
response_sequence: [acknowledge, request_missing_fields, read, status_first, next_step]
style: concise_warm
escalate_when: [order_not_found_twice, customer_disputes_delivery]
```

It should not store one old email as the universal response or imitate the owner's wording exactly.

## 6. Customer-side architecture

The component in customer infrastructure should be a **thin Voomate Edge**, not the whole brain.
It can ship as the existing SDK plus an optional self-hosted sidecar for customers who need it.

### Voomate Edge responsibilities

- Publish a signed UI and capability manifest.
- Expose named, parameter-validated, read-only queries.
- Expose separately named write actions with narrow scopes.
- Project allowlisted public fields from every result.
- Emit signed business events and action outcomes.
- Enforce tenant, user, resource, and environment permissions locally.
- Reject replay, arbitrary URLs, arbitrary SQL, unknown tools, and unsigned requests.
- Keep client credentials inside the customer's environment.
- Prefer outbound connections so customers do not open inbound firewall access.

### Voomate control-plane responsibilities

- Maintain conversations, the BOP, workflow definitions, evaluations, and audit history.
- Plan each turn across knowledge, live reads, workflow state, and controlled actions.
- Run the model without raw credentials or direct database access.
- Route approved commands to Voomate Edge and verify the returned result.
- Provide dashboards for proposals, permissions, approvals, traces, quality, cost, and incidents.

### Understanding architecture without unsafe code access

Voomate should understand a customer's application through explicit contracts:

1. UI manifest: pages, surfaces, aliases, public facts, and navigation destinations.
2. Capability manifest: named reads/actions, input schema, output schema, sensitivity, and risk.
3. Entity manifest: business objects and relationships.
4. Event manifest: meaningful lifecycle events such as `order.shipped`.
5. Optional static analysis during setup: routes, OpenAPI schema, and component metadata, producing a
   reviewable manifest rather than retaining the repository.

Do not make full source-code ingestion a launch dependency. It raises security, support, context,
and accuracy costs before it proves customer value.

## 7. The shared operating loop

Every channel should use this logical path:

```text
1. Receive and authenticate
2. Resolve tenant, customer, channel, and current workflow state
3. Classify intent, risk, freshness, and confidence
4. Load the smallest relevant BOP and conversation context
5. Build a deterministic plan
6. Run independent reads/retrieval in parallel
7. Generate a draft or proposed action
8. Apply policy, permission, confidence, and confirmation gates
9. Execute through a durable workflow when state can outlive one request
10. Verify the external result
11. Respond naturally in the business's approved style
12. Record one correlated trace, outcome, cost, and evaluation sample
```

The model may propose steps 3, 5, 7, and 11. Deterministic code owns authentication, permissions,
execution, verification, and auditability.

## 8. Automation levels

Every capability has an explicit autonomy level. Autonomy is granted per tenant, capability, and
risk class, never for the whole agent.

| Level | Behavior | Default use |
| --- | --- | --- |
| 0 Observe | Learn and report patterns; perform no action | New connection |
| 1 Recommend | Suggest a workflow or next step | Early onboarding |
| 2 Draft | Prepare reply/action for human approval | Email, WhatsApp, CRM notes |
| 3 Confirm then execute | Ask for confirmation, execute, verify | Booking, cart changes |
| 4 Bounded auto-execute | Execute low-risk, reversible work within limits | Mature proven workflow |

Promotion requires enough successful evaluated runs, low incident rate, rollback capability, and
owner approval. Money movement, refunds, destructive changes, legal or medical decisions,
credential changes, and bulk messaging do not silently reach Level 4.

## 9. Workflow model

A workflow is a versioned state machine, not prose in a prompt. Each workflow defines:

- trigger and supported channels;
- required fields and sources of truth;
- ordered and parallel steps;
- read and write capabilities;
- preconditions and business rules;
- retry, timeout, idempotency, and compensation behavior;
- approval and escalation gates;
- public response policy;
- success, failure, and abandonment outcomes;
- evaluation cases and rollback version.

Use deterministic code for stable workflow structure. Use the model for understanding natural
language, extracting structured inputs, synthesizing grounded responses, and choosing among a
small set of authorized workflow branches.

## 10. Reuse strategy

Do not replace working infrastructure merely because a new agent framework is popular.

### Keep now

- TypeScript, Next.js/Fastify, Zod, Drizzle, Supabase Postgres, RLS, and pgvector.
- The three-agent model, Connect SDK, read-only live path, controlled action harness, and Logs.
- Bedrock Nova, Transcribe, Polly, Pipecat, and the existing promptfoo evaluation suite.
- Cedar for action policy while it meets the current authorization model.

### Adopt next

1. **OpenTelemetry** for standard trace context across widget, Web Agent, Integration Agent, voice,
   client Edge, retrieval, and actions. Keep the Voomate database as the product audit record; use
   OpenTelemetry as the interoperable transport for traces, metrics, and logs.
2. **Langfuse, self-hosted or managed pilot**, as an AI engineering view over traces, datasets,
   prompt versions, token cost, code evaluators, human review, and sampled LLM judges. Do not put
   tenant credentials or unrestricted message content into it.
3. **Nango pilot** for OAuth connection plumbing, encrypted token storage, refresh, and provider
   authorization. Keep Voomate's capability schemas, permissions, result filtering, and action
   harness; Nango is not the policy or workflow engine.

### Adopt when durable workflows are proven necessary

4. **Temporal TypeScript SDK** for workflows that wait, retry, receive events, require approval, or
   survive process restarts for hours or days. Start with one workflow, not a platform rewrite.
   Keep LLM and network work in Activities and deterministic state transitions in Workflows.
5. **MCP-compatible adapters** as an interoperability boundary where useful. MCP does not replace
   Voomate's trust model. Require audience-bound tokens, no token passthrough, a Voomate allowlist,
   schema validation, and the same execution harness.

### Evaluate later, do not switch now

- OpenFGA if authorization relationships become too complex for the existing Cedar policies.
- Kafka, Kubernetes, a separate vector database, or a workflow canvas only after measured scale or
  product requirements justify their operational cost.
- General multi-agent frameworks only for an isolated benchmark against the current orchestrator.

### Avoid as foundation

- Autonomous agent swarms, unrestricted browser/computer control, prompt-only permissions, dynamic
  tool installation, silent online prompt mutation, and raw third-party credentials in model
  context.

## 11. Ninety-day execution plan

### Phase 0: Freeze the doctrine and baseline (week 1)

- Make this document and the orientation skill mandatory references.
- Select ten customer journeys that represent actual value.
- Record current success rate, escalation rate, latency, token cost, and correction rate.
- Stop unrelated UI and framework work unless it supports one of those journeys.

**Exit:** every new task names the journey and metric it improves.

### Phase 1: Business Operating Profile v1 (weeks 2-3)

- Add the BOP schema, evidence records, versioning, confidence, and review states.
- Populate it from current website/SDK sync and UI manifests.
- Add a merchant-facing discovery report: "what Voomate understands" and "what is uncertain."
- Use the approved profile in all three channels.

**Exit:** two unlike businesses produce different profiles and behavior from the same code, with no
new permission inferred.

### Phase 2: Communication learning pilot (weeks 4-5)

- Connect one provider first: Gmail or WhatsApp, not both.
- Import a bounded, owner-selected sample with retention and deletion controls.
- Extract intents, style traits, workflow candidates, and escalation patterns.
- Show proposals and evidence before activation.
- Start in Draft mode only.

**Exit:** owners accept most useful proposals, private-data leakage tests pass, and drafts require
fewer corrections than the generic baseline.

### Phase 3: One complete workflow (weeks 6-8)

- Pick one high-frequency, low-to-medium-risk workflow such as lead qualification, appointment
  scheduling, or order-status resolution.
- Implement the versioned workflow definition, approval policy, idempotency, verification, and
  rollback.
- Use a durable workflow engine only if the flow waits or survives process boundaries.
- Prove it across Web and one communication provider.

**Exit:** at least 50 representative runs, at least 90% correct workflow selection, no unauthorized
writes, complete traces, and a measurable reduction in human handling time.

### Phase 4: Evaluation and controlled autonomy (weeks 9-10)

- Add OpenTelemetry correlation and optional Langfuse export.
- Run deterministic evaluators on every eligible trace and sampled AI judges on semantic quality.
- Turn corrections and failures into a tenant-safe evaluation dataset.
- Allow Level 3 execution only for the proven workflow.

**Exit:** release gates compare quality, cost, and safety to the previous version automatically.

### Phase 5: Repeatable connection kit (weeks 11-12)

- Finalize the Edge capability/entity/event manifest format.
- Provide templates for REST/OpenAPI, Postgres read replicas, and webhooks.
- Pilot Nango for one OAuth provider and compare build/support cost with the current connector.
- Document certification tests for every new connector.

**Exit:** a developer can add a safe read capability without changing the orchestrator, and a write
capability cannot ship without permission, idempotency, verification, and audit tests.

## 12. Definition of useful

A feature is not done because the model produced a good demo once. It is useful only when:

- it solves a named business journey;
- the source of every operational fact is known;
- it behaves correctly for at least two unlike businesses;
- permissions and tenant boundaries have failing negative tests;
- the action result is verified rather than assumed;
- the business can see what happened and why;
- a human can correct the learned behavior;
- quality, latency, cost, and escalation are measured;
- failures degrade safely and produce a useful next step;
- rollback is possible without deleting the customer's data.

## 13. Founder operating method

The founder should not need to identify every small UI or prompt defect. Work at three levels:

1. **Name the customer outcome.** Example: "A clinic visitor can reschedule without staff help."
2. **Provide real examples and unacceptable outcomes.** These become eval cases and safety gates.
3. **Approve product boundaries.** Decide risk, autonomy, retention, and escalation policy.

Engineering owns root-cause analysis, cross-channel consistency, regression coverage, metrics, and
implementation details.

Use this decision filter before starting work:

1. Which real customer journey improves?
2. What evidence proves the need?
3. Can the current architecture do it with a smaller change?
4. Does it add a new security or privacy obligation?
5. How will we test it across two different businesses?
6. What metric and failure threshold determine release?
7. What are we deliberately not building?

If those answers are missing, the task is not ready for engineering.

## 14. Immediate next product decision

Do not add more agents. Build **Business Operating Profile v1** and one communication-learning
pilot in Draft mode. This is the missing bridge between the current grounded/action-capable agent
and the adaptive operating system described here.

The first pilot should answer:

- Can Voomate learn a business's recurring intents and response structure from a bounded sample?
- Can the owner inspect and correct the result?
- Do approved traits improve responses across Web and Voice?
- Can the system propose a workflow without gaining any write permission?
- Does the improvement reduce correction rate and handling time?

Only after those are proven should Voomate automate the workflow.

## References

- Existing Voomate architecture: [architecture.md](architecture.md)
- Current Web Agent coordination: [web-agent-intelligence.md](web-agent-intelligence.md)
- Learning policy: [phase-4-learning.md](phase-4-learning.md)
- Security model: [security.md](security.md)
- Live-read contract: [connect-live-read.md](connect-live-read.md)
- [Temporal Workflows](https://docs.temporal.io/workflows)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [Langfuse evaluation concepts](https://langfuse.com/docs/evaluation/core-concepts)
- [Nango authorization overview](https://docs.nango.dev/guides)
- [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [OpenFGA authorization concepts](https://openfga.dev/docs/authorization-concepts)
