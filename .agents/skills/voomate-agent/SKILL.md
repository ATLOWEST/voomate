---
name: Voomate Agent Orientation
description: Core rules and constraints for the Voomate Agent OS platform. Always trigger this skill before modifying any agent, dashboard, or connection code to ensure alignment with the 3-agent structure and multi-tenant constraints.
---

# Voomate Agent OS — Orientation Skill

**Read this before touching any agent, dashboard, or connection code.** It exists so every coding session stays consistent with prior decisions instead of re-inventing or drifting from them.

## What this project is
Voomate: an AI agent platform giving small/medium businesses 3 working AI agents for customer conversations and real tasks, across voice, web chat, and connected tools.

## The 3 fixed agents (never change this)
1. **Voice Calling Agent** — inbound/outbound phone calls
2. **Web Agent** — chat + voice widget on the business's site
3. **Integration Agent** — holds multiple connected tools (Calendar, Razorpay, WhatsApp, CRM) as sub-connections inside ONE agent slot

## Hard constraints — do not violate these
- **Exactly 3 agent slots per account. Always.** No "create new agent" button that spawns more. No naming multiple agents of the same type. If asked to add a 4th agent type, confirm with the founder first — this is a deliberate, load-bearing decision, not an oversight.
- **No industry/business-type presets.** One universal tool library (Actions / Communication / Integrations) works across every business type. Never add an "E-commerce / Clinic / Restaurant" selector.
- **Connections are simple, not a canvas.** Only 2 possible connection pairs exist: Voice↔Integration and Web↔Integration. Implement as a click-to-connect interaction on the agent board — do NOT add a node-based canvas library (React Flow etc.) for this; that was considered and explicitly rejected as overkill for only 2 possible pairs.
- **Multi-tenant isolation first.** Every table needs a `tenant_id` + Row Level Security before any feature work. Never skip this to "move faster."
- **No promise of 100% accuracy.** Design for grounded answers (RAG) + confidence-based human escalation, not perfection.

## Build order (don't skip ahead)
1. Multi-tenancy + RLS foundation, Logs tab
2. Web Agent, ONE real tool, verify the full loop in the Logs tab 10x before continuing
3. Second tool on Web Agent
4. Integration Agent slot, ONE real connected tool (start with Calendar)
5. Connect Web Agent ↔ Integration Agent, verify cross-agent flow in Logs
6. Voice Calling Agent (telephony), reusing the same proven pattern
7. Connect Voice ↔ Integration
8. Harden: guardrails on money-touching actions, eval set, rate limiting

## Non-negotiable safety pattern for every tool
Every tool call: validated against tenant permissions → executed through a controlled internal API (never raw DB/API credentials handed to the model) → logged. Actions above a risk threshold (refunds, cancellations) require explicit confirmation before executing.

## Reference docs (read the relevant one before starting related work)
- `voomate-industry-architecture-prompt.md` — multi-tenancy, scaling, security, accuracy design
- `voomate-agent-board-connections-spec.md` — the 3-slot board, setup flow, connect/disconnect interaction
- `voomate-functional-spec.md` — button-by-button behavior for Dashboard, Integrations, Usage, Conversations
- `voomate-production-build-roadmap.md` — staged build order with verification checkpoints
- `voomate-service-overview.md` — one-page product summary

## When in doubt
Prefer the simplest version that matches the constraints above over a more "impressive" architecture. This product has already had scope walked back twice (unlimited agents → 3 fixed; full canvas → click-to-connect) because more complexity was added than the actual requirement needed. Default to asking before adding structural complexity, not after building it.
