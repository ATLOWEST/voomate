# Voomate CTO plan: from Web Agent to Business Agent OS

**Date:** 2026-08-20
**Decision horizon:** next 90 days
**Product rule:** sell verified business outcomes, not agent count or model novelty.

## Executive conclusion

Voomate already has unusually strong foundations for an early product: tenant-scoped Postgres and
RLS, a shared text/voice reasoning path, grounded retrieval, signed origin-bound widget sessions,
controlled live reads, Cedar authorization, immutable run events, usage meters, and an evaluation
suite. The main weakness was a gap between the product doctrine and the control-plane contract.

This change set closes the first part of that gap:

- the catalog is shared and versioned;
- lifecycle transitions are server-enforced, idempotent, audited, and non-destructive;
- sessions are tied to a monotonic configuration revision and revocable execution lease;
- the first durable, evidence-backed Business Operating Profile contract exists;
- approved profiles are pinned to agents and consumed by the shared Web/voice reasoning path;
- unapproved learning remains advisory;
- the existing navigation regression no longer leaves the test gate red.

This is not a claim that the whole Agent OS is finished. Durable workflows, provider credential
vaulting, human handoff connectors, Edge acknowledgements for customer-hosted runtimes, billing,
and production-scale validation remain release work.

## Lessons from the reference companies

### Ada

Ada’s useful pattern is one intelligence and operating loop across channels, with Actions for a
single API operation, structured Playbooks for multi-step SOPs, Coaching from reviewed
conversations, Simulations before launch, and performance measured by resolution rather than
deflection. Ada also reports using both end-to-end outcome tests and isolated capability tests,
repeated to measure non-deterministic consistency.

References:

- <https://www.ada.cx/platform/>
- <https://docs.ada.cx/generative/docs/automation/playbooks>
- <https://docs.ada.cx/generative/docs/optimization/coaching/coaching-tools>
- <https://www.ada.cx/labs/research/unified-reasoning-engine-evaluation-science/>

Voomate should adopt the operating discipline, not copy Ada’s product surface. In particular,
simulation must never execute a production write endpoint; Voomate simulations should use mocks,
sandbox tenants, or an explicit dry-run contract.

### Nugget

Nugget’s useful pattern is the simple operating lifecycle **Design -> Refine -> Scale -> Observe**,
with business and performance metrics visible before expansion. Its public product emphasizes
voice/chat workflows, live integrations, audit trails, QA scores, per-tenant isolation, model
fallback, and outcomes across support, collections, onboarding, claims, invoicing, and training.

References:

- <https://www.nugget.com/>
- <https://www.nugget.com/resources/ai-voicebots-debt-collection/>

Voomate should copy neither the industry-page architecture nor unverified marketing numbers. The
platform remains universal; repeatable workflow packs may be sold by journey only after the same
runtime proves itself across unlike businesses.

## Voomate’s defensible difference

The strongest USP is not “more autonomous agents.” It is a governed business adaptation layer:

1. **Business Operating Profile:** every learned behavior is structured, sourced, confidence-rated,
   reviewable, versioned, testable, and reversible.
2. **Edge-owned authority:** credentials and local enforcement stay in the customer environment;
   the model sees named capabilities, never raw credentials, SQL, or arbitrary URLs.
3. **One runtime, many businesses:** no industry selector and no forked clinic/shop/restaurant code.
4. **Autonomy earned per capability:** observe, recommend, draft, confirm, then bounded execution;
   never one global “autonomous” switch.
5. **Outcome and economics in one trace:** resolution, verification, escalation, latency, model/tool
   cost, and correction all share tenant, agent, workflow, conversation, and run identity.

## Phase 1 — Trustworthy control plane

**Status:** foundation implemented in this change set.

Delivered:

- shared catalog contract with honest release states;
- `draft / active / paused / archived` lifecycle;
- safe archival and restore-to-paused behavior;
- desired/observed revision fields and revocable execution leases;
- lease/revision-bound Web and voice tokens;
- runtime gates for turns, tools, webhooks, voice, and inter-agent routing;
- tenant audit events and database invariants;
- BOP version/evidence storage with RLS.

Exit gate before a client pilot:

- migrations 0013–0015 plus the RLS policy migration applied in staging;
- pause/archive negative tests across session, message, voice, webhook, schedule, and tool paths;
- no cross-tenant read/write in the database verifier;
- restore drill proves audit evidence remains and revoked credentials do not return;
- external DAST and an independent penetration test scheduled before sensitive customer data.

## Phase 2 — Adaptive intelligence that a business can control

**Status:** data contract, approval API, agent pinning, and runtime consumption implemented; merchant
review UI and bounded provider learning pilot remain.

Build next:

1. Discovery report showing known, uncertain, conflicting, stale, proposed, and approved fields.
2. Bounded Gmail *or* WhatsApp sample import with consent, retention, PII/secret redaction, and
   deletion. Start with one provider.
3. Proposal extraction for intents, response structure, required fields, terminology, escalation,
   and workflow candidates. Never infer a permission.
4. Offline replay against historical cases and two unlike sandbox businesses.
5. One-click approve/reject/edit with diff, evaluation result, and rollback.

Exit gate:

- at least two unlike businesses produce different behavior from the same runtime;
- every active field has evidence and an approval history;
- zero permissions gained from historical behavior;
- approved profile reduces correction rate versus the generic baseline;
- private-data leakage and deletion tests pass.

## Phase 3 — Durable outcomes and profitable scale

**Status:** required next; do not add more agent types first.

Build one complete journey such as appointment scheduling, lead qualification, or order-status
resolution as a versioned state machine with idempotency, approval, retries, verification,
compensation, and rollback. Add Temporal only if the first journey must wait or survive a process
restart. Add OpenTelemetry correlation and a Langfuse pilot only as an engineering view; the
Voomate database stays the customer audit authority.

Commercial exit gate:

- 50+ representative replay/sandbox runs and repeated non-deterministic evals;
- at least 90% correct workflow selection for the named journey;
- no unauthorized writes and 100% verified action receipts;
- measurable reduction in human handling time;
- p95 latency and failure budgets met by channel;
- contribution margin measured per successful outcome, not estimated from message count.

## Unit-economics contract

For each journey and billing period, compute:

`contribution margin = outcome revenue - model - retrieval - voice - connector - workflow - support allocation`

Track at minimum:

- attempted, verified, escalated, corrected, and abandoned outcomes;
- cost per attempt and cost per verified outcome;
- cache hit rate and avoidable model calls;
- p50/p95 latency by stage and provider;
- tenant gross margin and plan-limit pressure;
- human minutes saved, with the merchant’s baseline recorded before automation.

Do not optimize token price in isolation. A cheaper model that causes more retries, corrections, or
handoffs can have a higher cost per verified outcome.

## Explicit non-goals for this horizon

- no autonomous agent swarm;
- no industry-specific runtime forks;
- no online self-modifying production prompt;
- no unrestricted browser, SQL, HTTP, inbox, or source-code access;
- no workflow canvas before repeated workflows prove the need;
- no fabricated latency, isolation, resolution, concurrency, or ROI claims on the landing page.
