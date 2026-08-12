# ADR 0003 — Ship the widget as an iframe, not Shadow DOM

**Status:** Superseded · 2026-08-11 by the framework-agnostic Web Component requirement

## Context

The widget renders on merchant websites we do not control, next to JavaScript we do not
control. It handles session tokens and conversation content, some of it personal. The two
common approaches are Shadow DOM (inject a custom element into the host page) or an iframe.

Shadow DOM is lighter, avoids double-loading a framework, and makes it easier to animate the
widget against the host page.

## Decision

Render the widget UI inside a **cross-origin iframe**, loaded by a tiny script that stays on
the host page. `postMessage` with strict origin checks on both ends is the only channel.

## Rationale

**Shadow DOM isolates CSS. It does not isolate JavaScript.** Anything running on the merchant's
page — their code, an analytics tag, a compromised third-party script, a browser extension —
shares a JS context with the widget. It can read our session tokens, read the visitor's
conversation, and tamper with what's displayed.

Merchant sites carry a lot of third-party JavaScript. Treating the host page as trusted is not
a defensible assumption. The iframe gives a real browser-enforced origin boundary: host page
scripts cannot reach into it.

Secondary benefits: total CSS isolation (no merchant stylesheet can break our UI, and we
cannot break theirs), and our own CSP inside the frame.

## Consequences

- **All host communication goes through `postMessage`** — a defined, versioned protocol
  (`packages/core/src/widget-protocol.ts`) rather than ad-hoc function calls.
- **Sizing and positioning need coordination.** The loader owns the outer frame geometry; the
  iframe requests size changes via protocol messages.
- Microphone permission is requested from the iframe's origin, so the embed needs
  `allow="microphone"`. This is a documented install requirement.
- Slightly heavier initial load. Mitigated: the loader is tiny and the iframe content is
  lazy-loaded on first open, so a visitor who never opens the widget pays almost nothing.
- Mobile viewport behaviour needs explicit handling; iframes and mobile keyboards interact
  awkwardly and this needs real device testing.

## Revisit if

Never, for the token-handling surface. If we later ship an inline, embedded-in-page variant
for merchants who want the agent as part of their layout, that variant must not hold session
tokens directly — it would proxy through the iframe.

## Superseding decision

The product contract now requires a Web Component with Shadow DOM and no iframe. The host page
can therefore observe the public embed key, short-lived widget token, and rendered conversation;
this is an accepted constraint of an inline component, not an origin-isolation guarantee.

The compensating controls are server-side: the public key is domain-restricted, the session token
is short-lived and cryptographically bound to the verified `Origin`, every request re-checks the
agent/tenant binding, rate limits key by public key plus origin, and all privileged operations stay
inside the Secure Execution Harness. No business credential or Bedrock credential enters the Web
Component. There is no `postMessage` channel in this implementation.
