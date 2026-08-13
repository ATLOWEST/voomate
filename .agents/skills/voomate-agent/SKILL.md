---
name: Voomate Agent Orientation
description: Core rules and constraints for the Voomate Agent OS platform. Always trigger this skill before modifying any agent, dashboard, SDK, or connection code to preserve the flexible agent topology and multi-tenant constraints.
---

# Voomate Agent OS - Orientation Skill

**Read this before touching any agent, dashboard, SDK, or connection code.** It keeps each coding
session aligned with the founder's current product decisions.

## What this project is

Voomate is an AI agent operating system for small and medium businesses. A workspace activates the
agents it needs from a governed catalog, connects them to approved business systems, and operates
them from one live control panel.

## Current agent catalog sequence

The current product sequence is Web Agent, CRM Tool Agent, SEO Agent, then Calling Agent:

1. **Web Agent** - available now for chat and voice inside a website or application.
2. **CRM Tool Agent** - in design for governed customer-record and follow-up workflows.
3. **SEO Agent** - planned after CRM for governed search and content workflows.
4. **Calling Agent** - planned after SEO for inbound and outbound phone calls.

Planned types may appear in the catalog UI, but must be disabled and labeled honestly until their
runtime, policy, trace, and evaluation contracts ship. A workspace may activate any released type
it needs or none while configuring. The catalog is not a permanent four-agent limit. Never
special-case a new type into execution code outside the shared catalog contract.

## Hard constraints

- **Flexible does not mean ungoverned.** Every agent instance has a stable ID, catalog type,
  tenant, purpose, lifecycle state, policy set, capability scopes, configuration revision, and
  audit history. Plan and policy limits control how many instances can run.
- **Lifecycle is enforced, not cosmetic.** Use `draft -> active <-> paused -> archived`. Pausing or
  archiving revokes execution eligibility immediately at the control plane and then propagates the
  desired state to Voomate Edge. Never show success for a local-only toggle.
- **Deletion preserves control evidence.** A dashboard delete first pauses, revokes leases and
  credentials, disconnects triggers, and archives the instance. Physical data deletion follows the
  tenant's retention policy; audit records are not silently erased.
- **No industry presets.** One universal tool and workflow library adapts from evidence. Never add
  an "E-commerce / Clinic / Restaurant" selector.
- **Connections are explicit and permissioned.** A connection is typed, directional,
  tenant-scoped, versioned, and limited to named capabilities. "Connect all" creates reviewed
  allowed links; it never copies every permission to every agent. Prefer a list or matrix until
  measured topology complexity proves that a canvas is useful.
- **Multi-tenant isolation first.** Every tenant-owned table and query is tenant-scoped, with Row
  Level Security where the database supports it.
- **No promise of perfect accuracy.** Use grounded answers, confidence gates, verification, and
  human escalation.

## Build order

1. Multi-tenancy, RLS, audit identity, and Logs.
2. Agent catalog, instance lifecycle, desired-state revisions, and usage identity.
3. Web Agent with one real tool, verified end to end in Logs.
4. Shared connection layer with one real connector and one explicit Web-to-tool connection.
5. Voomate Edge heartbeat, signed configuration sync, execution lease revocation, and receipts.
6. Release later agent types in the approved sequence, each reusing the same control and workflow contracts.
7. Flexible connection list/matrix and safe "connect all" for reviewed links.
8. Guardrails for money-touching actions, evaluations, rate limits, rollback, and incidents.
9. Add another agent type only through the catalog, lifecycle, SDK, policy, trace, and evaluation
   contracts.

## Non-negotiable safety pattern

Every tool call is validated against tenant and agent permissions, executed through a controlled
internal API, and logged. The model never receives raw database or provider credentials. Actions
above a risk threshold require explicit confirmation and a verified result.

## Reference docs

- `docs/agent-operating-system-north-star.md` - authoritative product doctrine, agent control
  plane, Business Operating Profile, behavioral learning boundaries, and execution path.
- `docs/architecture.md` - current service boundaries and trust model.
- `docs/connect-live-read.md` - read-only client data contract.
- `docs/web-agent-intelligence.md` - current Web Agent coordination.
- `docs/roadmap.md` - staged delivery and verification checkpoints.
- `docs/security.md` - security controls and tenant boundaries.
- `voomatefeature.md` - product and service overview.

## When in doubt

Prefer the smallest active agent set that solves the customer's workflow. The platform is
extensible, but the runtime must never create a swarm, grant implicit permissions, or add a new
agent type outside the shared contracts. Product flexibility lives in a governed catalog and
control plane, not in unbounded prompt-created personas.
