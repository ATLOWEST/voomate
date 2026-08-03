# ADR 0002 — Use Amazon Chime SDK (WebRTC) for real-time audio transport

**Status:** Accepted · 2026-08-02

## Context

Audio must move between the visitor's browser and our voice orchestrator with low latency and
support for barge-in. Two realistic options: raw WebSockets over our own Fargate service, or
WebRTC via Amazon Chime SDK.

WebSockets are meaningfully simpler — one connection, binary frames, no session management,
no media plumbing.

## Decision

Use **Amazon Chime SDK** for media transport.

## Rationale

The decisive factor is **echo cancellation**. Barge-in requires detecting the visitor speaking
over the agent. Without echo cancellation, the microphone hears the agent's own voice through
the visitor's speakers and the agent interrupts itself constantly. Building acoustic echo
cancellation properly is a serious signal-processing project; WebRTC provides it as a
platform feature.

Beyond that, WebRTC brings jitter buffering, packet-loss concealment, and adaptive bitrate.
Our target markets — India, Latin America, Southeast Asia — have a high share of visitors on
mobile networks with real packet loss. Over a WebSocket, a lost packet is a dropped word and
a wrong answer.

## Consequences

- **Significantly more complex.** Meeting/attendee lifecycle, a server-side media pipeline
  that joins the session, and more failure modes to handle and debug.
- **Deferred to Phase 3**, deliberately after the text MVP proves knowledge quality. We do not
  want to debug retrieval and real-time media at the same time.
- **Higher cost per minute** than a raw WebSocket. Must be reflected in unit economics from
  the start.
- Client SDK adds weight to the widget — so it is **lazy-loaded only when a voice session
  starts**. Text-only visitors must never pay for it.

## Rejected alternative

**WebSocket + client-side echo cancellation** (`getUserMedia` with `echoCancellation: true`).
Browser AEC is tuned for the browser's own audio output and behaves inconsistently when the
far-end audio is synthesised and injected the way ours is. Good enough for a demo; not for a
product whose core promise is a natural conversation.

## Revisit if

Chime per-minute cost dominates unit economics at scale, and measured quality on a WebSocket
path with browser AEC turns out to be acceptable in our actual target networks.
