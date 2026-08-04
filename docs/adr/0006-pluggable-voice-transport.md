# ADR 0006 — Make voice transport pluggable; ship WebSocket before WebRTC

**Status:** Accepted · 2026-08-03 · **Amends [ADR 0002](0002-webrtc-chime-transport.md)**

## Context

ADR 0002 chose Amazon Chime SDK (WebRTC) for real-time audio, on one decisive argument:
WebRTC gives acoustic echo cancellation as a platform feature, and without echo cancellation
barge-in detection hears the agent's own voice and the agent interrupts itself.

That argument is correct and is not being reversed. Two things about it have become clearer
now that Phase 3 is actually being built:

**1. Chime SDK has no first-class server-side participant.** Chime SDK Meetings is a
conferencing product. Its client SDKs are browser and mobile. Putting our orchestrator *into*
a meeting from a Fargate container means either a headless Chromium running the JS SDK, or the
media-pipeline products, neither of which is a small piece of work. The estimate in ADR 0002's
"significantly more complex" line was, on inspection, low.

**2. None of the difficult work depends on the transport.** Turn-taking, barge-in arbitration,
backchannel classification, echo windows, sentence-streamed synthesis, voice locking,
per-stage latency instrumentation — the parts that decide whether the product feels alive —
consume audio frames and emit audio frames. They do not care how those frames arrived.

Sequencing the entire phase behind a transport sub-project inverts the risk: it spends the
first weeks on the part with the least product uncertainty.

## Decision

**Audio transport is an interface, not an assumption.**

```ts
interface AudioTransport {
  onAudio(handler: (pcm: Int16Array) => void): void;
  send(pcm: Int16Array): void;
  control(message: ServerToClientMessage): void;
  close(reason: string): void;
}
```

Ship a **WebSocket transport first** (16 kHz mono PCM up, 16 kHz mono PCM down, JSON control
frames on the same socket). Browser-side echo cancellation via `getUserMedia` constraints.

Keep **WebRTC as the second transport**, to be added when measurement — not intuition — says
the echo path needs it. LiveKit and Chime both remain candidates at that point; LiveKit has
the first-class server SDK Chime lacks, and is already proven in the team's other product.

## Rationale

- The interface is small enough that a second transport is an addition, not a migration. If it
  ever stops being small, that is the signal that this decision was wrong.
- WebSocket works **today**, with zero new vendors, zero new credentials, and no deploy —
  which matters because the CDK deploy is currently blocked on an approval outside our control.
- The first consumer of voice is the **merchant preview in the dashboard**: one person, on
  their own laptop, usually wearing headphones, deciding whether to publish. Echo is not the
  binding constraint for that user. Getting the *conversation* right is.
- Deferring lets the WebRTC choice be made with real numbers: measured echo behaviour on real
  visitor devices, and a measured cost per minute to weigh it against.

## Consequences

- **A visitor on loud laptop speakers may hear the agent interrupt itself** until a WebRTC
  transport ships. This is a real quality gap and must be described honestly in the dashboard
  when voice is enabled, not discovered by a merchant.
- Packet loss on poor mobile networks degrades worse over TCP than it would over WebRTC. Our
  target markets have exactly those networks, so this caps how far the WebSocket transport can
  be pushed — it is a starting point, not the destination.
- Two transports eventually means two sets of connection-failure behaviour to test.
- The widget stays lighter for longer: no WebRTC client SDK to lazy-load in Phase 3.

## Rejected alternatives

**Build Chime first anyway, as originally planned.** Rejected on sequencing, not on merit:
it front-loads the work with the least product risk and the most infrastructure risk, and it
is blocked behind a deploy we cannot currently perform.

**Adopt LiveKit now instead of Chime.** Genuinely tempting — it has the server-side agent SDK
Chime lacks, and the team has production experience with it. Rejected *for now* only because
it adds a vendor, an account, and a credential before there is any measurement to justify one
WebRTC provider over another. This is the most likely decision to be revisited.

## Revisit if

Measured echo cancellation on the WebSocket path is poor enough on real visitor hardware that
self-interruption is common, **or** packet loss in India/LATAM/SEA measurably degrades
transcription. Either finding promotes WebRTC from "second transport" to "next task", and
LiveKit is the leading candidate.
