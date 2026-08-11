# @voomate/widget

Two separately-built artifacts with very different constraints.

| | Runs on | Budget | Contains |
|---|---|---|---|
| `src/loader/` | The **merchant's** page | **< 5kb gzipped** | Bubble, iframe, postMessage bridge |
| `src/app/` | **Our** origin, in an iframe | Generous | Session tokens, conversation, voice |

## Install snippet

```html
<script
  src="https://cdn.voomate.example/voomate.js"
  data-voomate-key="sq_your_public_embed_key"
  data-voomate-position="bottom-right"
  async
></script>
```

The embed key is **public** — it ships in page HTML by design. Security comes from the
server-side origin allowlist, not from the key being secret. See
[docs/security.md](../../docs/security.md).

## Why an iframe

Shadow DOM isolates CSS but **not JavaScript**. On a merchant page, their code — and every
analytics tag and browser extension on it — would share a JS context with the widget and
could read session tokens and conversation content. The iframe is a browser-enforced origin
boundary. Full reasoning in
[ADR 0003](../../docs/adr/0003-iframe-widget-isolation.md).

## The two rules for postMessage

Every handler, both directions, does both:

1. **Check the origin** against the expected one. This is what makes a message trustworthy.
2. **Check the envelope** (`parseHostEnvelope` / `parseFrameEnvelope`). This is what makes it
   *ours* — plenty of other scripts post messages on a busy page.

Neither check alone is sufficient. The protocol is versioned so a stale cached loader can be
detected rather than failing mysteriously.

## Loader size budget

The loader runs for every visitor on every page, whether or not they open the widget. It is
a tax on the merchant's Core Web Vitals, and a widget that slows a site down gets removed.

Keep it dependency-free. When you're tempted to add something, put it in the iframe app —
which loads lazily on first open. The Chime SDK is lazy-loaded a second time, on first
*voice* session, so text-only visitors never download the WebRTC stack.

## Status

Phase 0: the bridge and the trust boundary. The conversation UI lands with the text MVP
(Phase 2); voice in Phase 3. See [docs/roadmap.md](../../docs/roadmap.md).
