# Web Agent intelligence architecture

The Web Agent has one shared reasoning path for widget chat and widget voice. Voice is transport:
Transcribe turns audio into text, then calls the same message endpoint and conversation record used
by typed chat. Polly speaks the returned public answer.

## Runtime layers

1. A signed, origin-bound widget session resolves the organization and one published Web Agent.
2. A deterministic dialogue manager handles identity and human-handoff state without spending a
   model call or allowing the model to invent operational state.
3. A distinct deterministic orchestration layer splits one message into ordered intents, then
   plans current-page context, tenant-scoped knowledge, live reads, and separately controlled
   actions for each turn.
4. Tenant-scoped retrieval supplies only relevant approved knowledge, including on compound turns
   that also need live data.
5. Bedrock Inline Agents orchestrate Amazon Nova and return-control action groups. The runtime has
   no direct customer-facing Converse fallback.
6. Voomate executes returned actions through its permission checks and public-field serializers.
7. The public answer and immutable operational trace are stored against the same conversation.

Before an answer reaches the widget, the customer-language gate verifies that it is not an echo of
the visitor's message and contains no internal planning language. The trace records only the kind
of repair, evidence-source counts, and answer shape; it never stores the unredacted rejected text.

Every turn also writes one shared usage contract using the same tenant, agent, conversation, and
run identity as the trace. It counts accepted agent runs, actual model invocations and Bedrock trace
tokens, knowledge queries, embedding input, live reads, governed tool requests/failures, and reply
guard interventions. The Usage dashboard separates included plan units, provider-cost estimates,
and diagnostic meters so a reliability signal can never silently become a customer charge. See
`docs/web-agent-operating-system-blueprint.md` for the employee-facing operating guide and staged
infrastructure decisions.

## Bounded planning, informed by Khoj

Voomate borrows three useful orchestration ideas from
[`isaccanedo/khoj`](https://github.com/isaccanedo/khoj) without importing its runtime or turning the
customer widget into an open-ended research agent:

1. Separate source and output selection from final answer generation. The planner may propose
   knowledge, page context, live reads, or an approved action, but code validates that proposal
   against the tenant's enabled allowlist before execution.
2. Keep multi-step collection bounded. A workflow has a small maximum step count, stops repeated
   tool-and-query pairs, and falls back deterministically when no eligible source remains.
3. Budget context deliberately. Use only recent relevant conversation turns and compact grounded
   evidence instead of resending the full transcript, harness, and retrieval set every time.

Voomate's request path is therefore: classify intent, establish eligible sources, check trusted
operating state where needed, retrieve or read, execute only separately authorized actions,
synthesize one customer-facing answer, then apply customer-language and policy verification. The
planner never grants itself a capability, expands a credential scope, or learns directly into the
live policy from a successful-looking response.

## Voomate Brain and tenant branches

Voomate Brain is the shared, versioned execution layer: intent planning, response rules, approved
tool contracts, retrieval policy, and the Bedrock harness. It is not a shared memory or one AWS
agent that sees every merchant.

```text
Voomate Brain (shared code and reviewed harness)
  -> tenant execution branch: organizationId + agentId + configuration revision
      -> approved knowledge index, tools, policies, conversation, and audit trail
```

Creating an account creates a new scoped agent instance and configuration branch, not a clone of
the model. Every read, retrieval query, tool grant, conversation lookup, and run event carries the
organization and agent scope; Postgres RLS enforces that boundary again. One thousand customers
therefore use one maintained product runtime with one thousand isolated execution contexts. This
keeps personalization and data isolation without multiplying infrastructure cost or allowing a
tenant's knowledge to affect another tenant's answer.

Before inference, a deterministic coordination policy ranks the Integration Agent's read-only
capabilities against the current message and exposes at most eight relevant functions. An unrelated
turn sees no client-data tools. The plan records capability names and counts, never query values or
returned client data, in `agent_run_events`. This keeps tool schemas, model latency, and accidental
data access bounded while preserving explicitly scoped Web Agent to Integration Agent connections.

The widget also sends a bounded passive UI manifest: page title, meta description, visible main
headings, and same-origin navigation destinations. It never sends form values or a page text dump.
An account portal or dashboard on another origin is allowed only as an explicit HTTPS
`trustedDestination`, and only when the tenant's enabled deployment policy independently approves
that exact origin and path. Navigation is the only browser command in this contract; both server
and widget validate it before execution. All record changes remain separately scoped tools behind
the Secure Execution Harness.

On signed-in Operating Panel surfaces, the host may additionally publish count-only agent
inventory: total, active, draft, and paused. It contains no names, IDs, domains, credentials, or
configuration. The schema rejects extra fields and inconsistent totals. This allows onboarding to
choose “Add agent” versus “configure an existing agent” without exposing private workspace records.
The public site carries no operating state, so its assistant explicitly asks the visitor to sign in
instead of inferring that an account or agent exists.

## Browser and native navigation

Navigation is a typed client command, not a link hidden in model prose. The deterministic intent
gate separates an explicit movement request such as "take me to Pricing" from an information
request such as "what does Pricing cost?" A known destination always receives the verified
`navigate` command before retrieval or model inference. When the visitor combines both requests,
such as "Open Pricing and tell me what it costs", the command is issued first and host-curated
facts continue in the same turn. This does not wait for another prompt or send the same request to
Bedrock. Information-only requests still answer in the widget without navigation.

The destination resolver is separate from both orchestration and browser execution. It ranks only
host-advertised titles, natural-language aliases, same-origin path segments, and explicit trusted
handoffs. Bounded edit distance repairs ordinary spelling and transposition errors such as
`priing`, `agnets`, or `histroy`. Title and alias evidence outrank path-only evidence,
document-local hash anchors are not treated as feature destinations, and close candidates fail as
ambiguous. Unknown or ambiguous requests never ask the visitor for a URL: the agent offers
verified choices while remaining on the current page. The Logs trace records the outcome, match
type, confidence score, and candidate names without storing the visitor's routing phrase in
metadata.

Each manifest page may also carry bounded, public, founder-curated facts. Factual questions use
those facts inside the widget without navigation or a model guessing around missing knowledge.
Conceptual questions still use the synthesis harness, so curated facts do not become a script to
copy for every response.

For Next.js hosts, `VoomateNavigationBridge` handles `voomate:navigation-request` with client-side
routing and acknowledges the completed route through `voomate:navigation-complete`. The widget and
active WebRTC connection remain mounted during that change. Other browser applications can handle
the same cancelable event with their router. If no host accepts it, the widget uses
`window.location.assign` as the full-page fallback.

The UI manifest can advertise per-page iOS Universal Links, Android App Links, and official App
Store or Google Play destinations. Native and store URLs must be HTTPS, credential-free, declared
by the host, returned unchanged by orchestration, and verified again in the widget. Store handoff
runs only for an explicit install/download intent. The model cannot invent a deep link, arbitrary
external origin, or store URL.

Before a hard page or operating-system handoff, the widget stores only a signed continuation token,
conversation ID, open state, and voice-resume intent in `sessionStorage`. The new page exchanges
that separate 24-hour, origin-bound continuation token for a fresh short-lived widget session and
restores the canonical, tenant-scoped transcript from the server. A hard load necessarily replaces
the browser's WebRTC object; voice reconnects against the same conversation at the next safe turn.
SPA routing preserves the existing connection and streaming state directly.

The orchestration log records each planned source and reason. A compound question such as current
inventory plus return policy consults both the named live read and tenant knowledge, then Nova
synthesizes one answer. A live-data signal no longer disables stable knowledge retrieval.

Live facts are queried just in time from the client's server. Voomate cannot send generic SQL, call
an arbitrary URL, or mutate the client system: the client SDK accepts only declared named reads,
validates parameters, projects an allowlist of public fields before responding, rejects replayed
signed requests, and should run under a database principal with `SELECT` only.

The database transcript is canonical memory. Every Inline Agent turn receives a bounded transcript
and a fresh Bedrock session ID, preventing hidden managed-session state from outliving the signed
widget session or crossing a tenant boundary.

## Capacity and cost control

Deterministic navigation, host-curated page facts, identity replies, and clarification never call
Bedrock or retrieval. Factual questions use retrieval only when the orchestration plan says it is
needed, and tool catalogs are narrowed before inference. Model calls are admitted through one
Upstash-backed per-model counter shared by all dashboard tasks. Its configured limit remains below
the provider quota, so a burst receives a clear, retryable capacity response instead of driving
Bedrock into throttling. Horizontal ECS scaling can add request capacity without multiplying the
Bedrock limit; provider quota increases remain an explicit operations decision.

## Human escalation

The first ordinary request for a human gets an assist-first response. A repeated request, or a
serious issue, changes the conversation to `escalated`; that is a real review queue visible in the
Conversations dashboard. The assistant cannot claim a call, email, or transfer happened until a
future approved connector returns that result.

## Safe learning loop

Visitor thumbs feedback and offline Amazon Nova model-as-judge scores are stored as evidence. They
never update prompts, knowledge, permissions, or weights automatically. The reviewed loop is:

1. collect feedback and immutable evaluations;
2. inspect low-scoring tenant-scoped examples;
3. update a versioned behavior harness or approved eval case;
4. run Promptfoo regression tests;
5. promote the reviewed harness version.

RLAIF is deliberately advisory and offline. Judge scores may prioritize review and regression
cases, but they cannot change routing, permissions, prompts, knowledge, capability manifests, or
model weights on a live request. Promotion remains a reviewed, versioned deployment decision.

Promptfoo runs a separate Nova judge beside every deterministic regression. It scores grounding,
tool choice, human tone, directness, and synthesis as the named `AIJudge` metric. An `afterAll`
extension appends aggregate scores to the ignored local results history so quality can be compared
across harness versions rather than viewed only as pass or fail.

## Production hardening path

When the controlled tool surface grows beyond the current two fixed connection pairs, place the
same contracts behind Amazon Bedrock AgentCore Gateway and a deny-by-default Cedar policy engine.
Authorize each invocation using tenant identity, agent slot, capability name, sensitivity, and
validated input attributes. Keep the SDK's client-side projection and `SELECT`-only database role:
gateway authorization is another boundary, not a replacement for least privilege at the data
source. Roll this out behind shadow policy decisions first and compare them with the existing audit
trace before enforcement.

The current runtime already enforces the same core contract with the official Cedar engine before
every SDK invocation. Its versioned policy is deny-by-default and permits only active connections
whose database tenant and agent ownership match the run. Customer-sensitive reads additionally
require every declared verification field. Policy parsing or evaluation errors fail closed, and
the metadata-only trace records the policy version and decision. Moving evaluation to AgentCore
later changes the policy adapter, not the authorization contract or client data boundary.

Run `npm run eval:web-agent:conversations` to score stored, previously unevaluated agent messages.
The worker uses an Amazon Nova Inline Agent, logs no transcript or credentials locally, and stores
only scores, flags, and a short rationale.
