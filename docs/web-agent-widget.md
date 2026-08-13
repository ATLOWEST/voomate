# Web Agent widget

This milestone is the first production-shaped loop: a framework-independent Web Component,
an origin-bound session, Amazon Nova on Bedrock, one controlled tool, and tenant-visible run logs.

Low-risk text turns use Nova Micro. Requests that may need live data, an action, or an image use
Nova Pro.
The browser never receives AWS credentials and never invokes either model directly.

## Behavior harness and eval loop

The active, request-time-loaded instructions live in
`apps/dashboard/harness/web-agent.v1.md`. Increment its frontmatter version whenever behavior
changes; every run records that version in Dashboard → Logs. Keep the previous version as a
named file so a regression can be reproduced or rolled back.

Promptfoo runs the 15-case Amazon Bedrock/Nova regression suite:

```bash
npm run eval:web-agent
```

Open `evals/web-agent/results/latest.html` for the report. During harness editing, run
`npm run eval:web-agent:watch`; it reruns after harness or test changes. Promptfoo itself is free
and open source, but real Bedrock eval requests still incur normal AWS model charges.

## Install

Production embeds use the stable bootstrap URL:

```html
<script src="https://widget.voomate.com/embed.js" data-agent="PUBLIC_KEY" defer></script>
```

`embed.js` is intentionally tiny. It renders the launcher and lazy-loads the pinned
`/embed/v2/widget.js` implementation only when a visitor opens it. `v1` remains available for
existing installs; future breaking releases get a new version rather than silently changing old
versioned assets.

Widget v2 keeps one mounted conversation across three visual states. **Minimize** collapses the
panel into a compact island that preserves chat and any active voice session. **Close** stops an
active microphone session and returns to the circular launcher. Tapping the island or launcher
restores the same conversation. The compact island uses a restrained two-second animated border;
`prefers-reduced-motion` disables it.

The deployment should route `widget.voomate.com` to the dashboard Next.js service for this
milestone. Put the two static assets behind a CDN. The versioned asset is served with a one-year
immutable cache header; the stable bootstrap uses a short cache so its version pointer can move.

## Content Security Policy

Sites with CSP must permit the widget origin in both directives:

```text
script-src 'self' https://widget.voomate.com;
connect-src 'self' https://widget.voomate.com https://PROJECT.supabase.co;
```

Voice-enabled sites must also allow the configured Pipecat WebRTC service in `connect-src`. Browser
microphone capture is governed by Permissions Policy, so iframe-based hosts must include
`microphone` in their `allow` policy. If either policy or the visitor blocks the microphone, the
same widget remains fully usable in chat-only mode.

Image uploads also require the project's exact Supabase Storage origin in `connect-src`, for
example `https://PROJECT.supabase.co`. Production should map that endpoint to a stable Voomate
upload subdomain so merchants do not need to change CSP if the storage project changes.

No `unsafe-inline`, cookies, eval, host React, jQuery, or other host-page dependency is required.
The Web Component uses Shadow DOM and a constructable stylesheet. The host site must register its
exact `https://` origin in the agent's allowed origins. Local development also accepts
`http://localhost`.

## Voice mode

Voice is a lazy-loaded mode inside widget v2, not another agent or page. The first mic tap downloads
the Pipecat browser client and starts a WebRTC session; text-only visitors do not pay that bundle
cost. Pipecat orchestrates Amazon Transcribe streaming STT, the exact existing Next.js Web Agent
turn path (stored conversation, versioned harness, RAG and controlled tools), and Amazon Polly with
the `generative` engine. The service refuses to start if a lower Polly tier is configured.

Run the two local processes with the same `WIDGET_TOKEN_SECRET`:

```bash
npm run dev:dashboard
npm run dev:voice
```

Set `VOICE_SERVICE_ORIGIN=http://localhost:7860`. A typed turn creates the conversation ID; starting
voice passes that ID through the origin-bound short-lived token session, and later typed turns keep
using the same ID. Pipecat's VAD broadcasts an interruption when the visitor starts talking, which
cancels queued Polly audio and returns the UI to listening. No AWS credential, tenant ID, raw audio,
or transcript is written to browser storage or voice-stage log metadata.

## Image attachments

Widget v2 accepts drag/drop or file-picker uploads with these enforced server-side limits:

- 2 JPG/PNG/WebP images per message, 5 MB each
- 6 image slots per session/domain/key per minute and 10 per widget session
- Magic-byte and full decode validation; extensions and browser MIME declarations are untrusted
- EXIF/GPS/XMP/IPTC stripped, longest edge capped at 1568 px, output normalized to WebP
- Raw quarantine object deleted immediately after processing; sanitized object deleted after 48h
- Each processed image ID is tenant/session bound and can be consumed by only one model request

The private bucket is `web-agent-images`. The signed URL exposes only an HMAC-derived opaque scope,
never `organization_id` or `agent_id`. Supabase's native upload signature lasts up to two hours, but
Voomate permits finalization for only 10 minutes and deletes abandoned quarantine paths after the
native signature expires. Nova receives sanitized bytes through Bedrock Converse; it never receives
the Supabase service key, object path, filename, EXIF, or a public permanent URL.

Schedule the cleanup route at least hourly:

```bash
curl -X POST https://widget.voomate.com/api/internal/web-agent/images/cleanup \
  -H "Authorization: Bearer $IMAGE_CLEANUP_SECRET"
```

Set `IMAGE_CLEANUP_SECRET` to at least 32 random characters. The sign endpoint also performs a small
opportunistic cleanup batch so local development does not accumulate abandoned objects.

## First tool setup

Apply the generated database migration, then the RLS policy file:

```bash
npm run db:migrate
npm run db:manual -- 10
```

For the Web Agent, add an active `agent_active_tools` row named `check_order_status`. Import orders
into `web_agent_orders`, including the checkout email used to verify ownership. The controlled tool
queries with both `organization_id` and order identity, then maps the database record through the
public field allowlist. `internal_notes`, `cost_amount`, and the verification email never reach Nova
or the visitor.

## Ten-run verification

With the Next.js app and database running, set the five `WEB_AGENT_*` variables named by the smoke
script and run:

```bash
npm run smoke:web-agent
```

It performs ten real Nova Pro + `check_order_status` turns. Verify each run under Dashboard → Logs
before adding another tool or starting voice.

For the real two-image vision and rejection checks:

```bash
npm run smoke:web-agent-images
```

This uploads two generated package images, confirms Nova Pro describes their visible damage, then
confirms clean rejection of a third image, an oversized declaration, and a text file renamed to
`.png`. It also verifies that Logs and Usage agree on Bedrock's actual input-token count for the
two-image request; Nova Pro v1 image token use varies with the normalized image dimensions.
