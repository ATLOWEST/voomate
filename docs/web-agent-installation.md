# Web Agent installation contract

This document is the single engineering source of truth for installing the browser Web Agent.
The primary public-site flow must never require a merchant to type a domain, create a permanent
API key, understand environment variables, or implement a framework-specific verification API.

## Canonical one-request flow

1. The authenticated dashboard creates an agent-scoped `ig_` installation grant through
   `POST /v1/agents/:id/install-grants`. Only a hash is stored. Previous unfinished requests remain
   valid so copying twice cannot break a request already sent to a developer. At most five may be
   active, and every grant expires after 6 hours.
2. The dashboard builds one copyable request containing:
   - the public `embed.js` script with the agent's non-secret `data-agent` identifier;
   - one agent-specific file path, `/.well-known/voomate/<embed-key>.txt`;
   - the short-lived grant as that file's exact plain-text content.
3. A coding assistant inspects the merchant's real router and deployment structure, adds the
   script once to each intended customer-facing browser layout, publishes the challenge file,
   and deploys through the repository's existing release path.
4. On a real page load, `embed.js` sends an observation containing only the origin, current path,
   and bounded path-only route inventory. It never sends cookies, query strings, page content,
   form values, browser storage, source code, or authentication data.
5. The control plane fetches the well-known challenge through the SSRF-protected crawler,
   requires the final response to stay on the observed origin, hashes its content, and matches it
   to an unexpired grant for the same tenant and agent.
6. A successful challenge atomically records `agent.installation_verified`, adds the exact origin
   to the agent policy, creates one enabled anonymous surface when needed, and marks the grant used.
   The dashboard polls this evidence and turns green without a refresh or manual verification.
7. Runtime access still requires all three independent gates: verified origin/page policy, active
   agent lifecycle with a current execution lease, and a short-lived origin-bound widget session.

## Security boundaries

- `sq_...` is a public embed identifier, never a credential.
- `ig_...` is a temporary installation grant. It can verify at most 25 origins for one agent,
  expires automatically, and cannot create sessions, identify customers, read business data, or
  call management APIs.
- `sk_...` is a long-lived server API key. It is not part of basic installation. Create one only
  when a signed-in surface needs customer identity or explicitly scoped private business data.
- A browser observation is useful live evidence but never authorizes an origin by itself.
- A static HTML diagnostic must not erase a real browser receipt; modern routers may inject the
  SDK after server rendering.
- Agent lifecycle remains independent. Installation may prepare and enable a web surface, but a
  draft or paused agent cannot serve visitors.

## Code ownership

| Concern | Canonical owner |
|---|---|
| Grant generation and tenant authorization | `apps/api/src/modules/agents/routes.ts` |
| Challenge path, validation, and atomic domain claim | `apps/api/src/modules/widget/installation.ts` |
| Anonymous SDK observation and widget-session gate | `apps/api/src/modules/widget/routes.ts` |
| Browser route inventory and access heartbeat | `apps/dashboard/public/embed.js` |
| One-request prompt construction | `apps/dashboard/src/lib/web-agent/installer.ts` |
| Merchant setup state and placement controls | `apps/dashboard/src/app/(app)/agents/[agentId]/install/install.tsx` |

The legacy `POST /v1/widget/installations/claim` and permanent server-key setup remain only for
existing deployments and advanced signed-in integrations. New basic installations must use this
well-known challenge contract.
