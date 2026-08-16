# Web Agent operating system blueprint

**Status:** Current product and engineering guide  
**Audience:** Founder, product, engineering, support, sales engineering  
**Last reviewed:** 2026-08-16

This guide explains how Voomate's Web Agent works, what is already production-shaped, what is
still missing, and which modern infrastructure should be adopted as the product grows. It extends
the [Agent Operating System North Star](./agent-operating-system-north-star.md); it does not create
a second product direction.

## The product in one sentence

Voomate installs one governed AI operating layer inside a business's website or application. It
understands the current customer request, checks the right approved sources, performs only allowed
work, verifies the result, and leaves a trace the business can understand.

The same runtime serves a shop, clinic, software product, local service, or another business. The
business evidence and enabled capabilities change. The architecture does not.

## One request, end to end

| Step | What happens | What an employee should check |
| --- | --- | --- |
| 1. Request | The origin-bound widget accepts chat or transcribed voice. | Logs shows **Received the request**. |
| 2. Conversation | Existing tenant-scoped history and escalation state are loaded. | The request remains in the same conversation. |
| 3. Plan | The orchestrator chooses direct conversation, page context, knowledge, live reads, tools, or a safe combination. | Logs shows **Planned the response** and selected sources. |
| 4. Ground | Approved knowledge is retrieved only when useful. Current facts use a named live read. | Logs shows source count and read capability. |
| 5. Reason | The model receives compact history, relevant evidence, and only eligible tool schemas. | Usage shows exact model calls and tokens. |
| 6. Authorize | Every read or action is checked against tenant, agent, connection, schema, and policy. | A denied step explains which boundary stopped it. |
| 7. Execute | Voomate invokes the controlled tool. The model never receives raw credentials. | Logs shows the named tool, status, and latency. |
| 8. Verify | Results are projected to public fields and the final reply is checked for internal language or echoing. | Logs shows **Protected the tool result** and **Verified customer language**. |
| 9. Deliver | One natural reply and any structured UI are returned to the widget. | Logs shows **Sent the answer**. |
| 10. Measure | Usage and trace rows are flushed with the same tenant, agent, conversation, and run identity. | Usage updates by agent and meter. |

## What the Web Agent can adapt from

Voomate should infer behavior from explicit evidence, never from an industry dropdown:

1. Public business knowledge: website pages, approved answers, and documents.
2. UI manifest: pages, aliases, public facts, and safe navigation destinations.
3. Capability manifest: named reads and controlled actions with input/output schemas.
4. Current page context: title, description, headings, and advertised navigation, never form data.
5. Connected-system metadata: which approved sources hold orders, appointments, accounts, or other
   current truth.
6. Reviewed conversation evidence: aggregate style, intent, and resolution patterns promoted
   through the Business Operating Profile evaluation loop.

The result is a versioned Business Operating Profile. An inference may change response structure or
propose a workflow. It may not grant a permission, activate a tool, or silently rewrite production
policy.

## Plug-and-play contract

A customer integration is plug-and-play only when it publishes a small, reviewable contract:

```text
Voomate Edge / Connect SDK
  UI manifest          pages, aliases, public facts, native destinations
  Read manifest        named SELECT-only capabilities and public output fields
  Action manifest      separately scoped writes with risk and confirmation rules
  Entity manifest      product, service, order, appointment, account shapes
  Event manifest       signed lifecycle events and verified outcomes
```

The Web Agent discovers the contract, the control plane reviews it, and the orchestrator exposes
only capabilities relevant to the current request. A client can add or remove capabilities without
changing Web Agent code. Removing a connection or pausing an agent revokes execution eligibility,
not only its dashboard appearance.

## Metering contract

`usage_records` is the Voomate source of truth for product usage. Every Web Agent meter is
tenant-scoped, linked to its agent, conversation, and exact run, and unique per run plus meter kind.
Retries therefore cannot silently double-count a completed run. Web Agent turns now record:

- accepted agent requests and typed messages;
- actual model invocations plus Bedrock-reported input and output tokens;
- knowledge queries and embedding tokens;
- read-only client-system calls;
- governed tool requests and failures;
- response-language guard repairs;
- existing image, voice, crawl, and speech units.

The dashboard separates three meanings that must never be mixed:

- **Included:** measured product use currently covered by the plan, such as approved tools.
- **Provider estimate:** directional infrastructure cost calculated from measured provider units.
- **Measured only:** reliability or capacity telemetry that is not a customer charge.

The provider estimate is not an invoice. Tool calls remain included until Voomate publishes and
versions an overage policy. Each new usage row stores its rate-card version and provider-cost
snapshot, so a future rate change does not silently reprice recorded history.

## Current architecture audit

### Strong foundations already present

- Origin-bound widget sessions and tenant-scoped conversation memory.
- One orchestration layer for chat and voice, with direct, knowledge, live-data, and navigation
  decisions.
- Bounded page context and verified same-origin browser/native navigation.
- Read-only Connect SDK with schema validation, public-field projection, replay protection, and
  customer-side credential custody.
- Deny-by-default Cedar live-read policy and separately controlled write tools.
- Structured response rendering, customer-language checks, human escalation, and offline evals.
- RLS-backed traces, usage, feedback, and immutable evaluation records.

### Important gaps after this release

1. **Approved Business Operating Profile storage:** current business-profile inference helps a turn,
   but proposed and approved profile fields still need their own versioned evidence tables and UI.
2. **Durable workflow instances:** chat turns are bounded, but multi-hour approvals, scheduled
   follow-ups, and cross-system jobs need persisted workflow state, retries, idempotency, and
   compensation.
3. **Portable telemetry export:** customer-visible traces exist in Postgres; production operations
   still need standard OpenTelemetry spans and metrics exported to the monitoring backend.
4. **Large capability catalog:** the current relevance filter is right for a small catalog. Hundreds
   of tools need gateway-backed discovery and semantic selection without sending every schema to
   the model.
5. **Billing entitlements:** usage is measured accurately, but plan limits, credits, overages,
   invoices, and alert thresholds need a separate reviewed entitlement contract.
6. **Outcome verification:** every write-capable tool must add an idempotency key, verified receipt,
   and a reconciliation path before it can be marked production-ready.

## Modern stack decisions

### Use now

- Keep Next.js, Fastify, Postgres/Supabase RLS, pgvector, Bedrock, Cedar, and the Connect SDK. They
  already match Voomate's trust boundaries.
- Adopt OpenTelemetry GenAI naming for model duration, time to first token, token usage, tool spans,
  and errors. Do not record prompts, customer messages, or raw tool outputs in telemetry by default.
- Continue using the local usage ledger as the product source of truth. It is simpler and safer than
  adding a billing platform before overage rules exist.

### Add when the trigger is real

- **Amazon Bedrock AgentCore Gateway / MCP:** add when reviewed capability schemas grow beyond the
  bounded in-process catalog or external MCP/OpenAPI targets become common. Gateway can aggregate
  tools, handle inbound/outbound authentication, synchronize catalogs, and support semantic tool
  search. Keep Voomate's tenant policy and client-side public projection as additional boundaries.
- **Temporal:** add for workflows that survive process restarts or wait on people, timers, and
  external systems. Do not place ordinary single-turn chat behind a durable workflow engine.
- **OpenMeter:** dual-publish immutable usage events when Voomate introduces credits, limits,
  overages, or invoices that exceed the local ledger. Postgres remains the reconciliation source
  during the transition.
- **AgentCore Observability:** adopt when the runtime moves behind AgentCore or when CloudWatch trace
  operations become preferable to a self-managed collector. It emits OpenTelemetry-compatible
  metrics, spans, and logs.

Official references:

- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
- [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html)
- [Temporal durable execution](https://docs.temporal.io/temporal)
- [OpenMeter documentation](https://openmeter.io/docs)
- [Amazon Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)

## Employee troubleshooting

Start with one request in **Agent activity** and find the first step that did not complete:

| Symptom | First place to look | Likely correction |
| --- | --- | --- |
| Generic answer | Planned response, then business knowledge | Sync approved knowledge or improve the UI manifest facts. |
| No current order/availability | Selected capabilities, then live-data permission | Activate the read connection and verify its manifest. |
| Tool did not run | Tool details, then tool permission | Collect missing fields or enable the reviewed tool. |
| Unsafe result was blocked | Protected tool result | Add only approved public fields to the capability projection. |
| Internal wording appeared | Verified customer language | Add the case to evals and review the harness; do not add a canned reply. |
| Unexpected cost | Usage and cost by agent | Inspect token, model-call, and tool meters for that agent. |
| Long-running work disappeared | Workflow instance, when shipped | Use the durable workflow path, not an in-memory chat turn. |

## Build sequence from here

1. Ship this trace and usage contract and collect a clean operating baseline.
2. Add versioned Business Operating Profile evidence, review, and promotion.
3. Add one durable approval workflow with idempotent execution and a verified receipt.
4. Export privacy-safe OpenTelemetry metrics and set tenant cost/reliability alerts.
5. Introduce AgentCore Gateway/MCP only after capability-catalog size proves the need.
6. Introduce billing entitlements and OpenMeter dual-write only after overage policy is approved.

This sequence makes the Web Agent more adaptable without creating an unbounded swarm, hidden
permissions, or a second source of truth.
