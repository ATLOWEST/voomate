# Phase 3 — Voice

The agent already knows things. Phase 3 makes it listen and speak.

This document is the plan. It is opinionated on purpose: voice is where this product either
feels alive or feels like a phone tree, and most of the difference comes from decisions made
before any audio is flowing.

---

## What "done" means

A visitor on a merchant's website presses a button, says *"how long do I have to send
something back?"* out loud, and hears a spoken answer that is **correct, cited, and fast enough
that they don't check whether it's broken**. They can talk over it and it stops. They can
switch from English to Hindi mid-sentence and it follows.

Three numbers decide whether that is true:

| Measure | Target | Why this number |
| --- | --- | --- |
| First syllable after the visitor stops speaking | **< 1.2 s** | Above ~1.5 s people assume the line dropped and start talking again. |
| Barge-in silence | **< 200 ms** | The gap between "I interrupted" and "it stopped". Above this it feels like arguing with a machine. |
| Wrong-language replies | **0** | Answering Hindi in English is worse than not supporting Hindi. |

Everything below exists to hit those three.

---

## The shape of one turn

```
visitor speaks
   │
   ├─ mic → 16 kHz PCM ────────────────► Transcribe streaming
   │                                      │  partial results (ignored for answering)
   │                                      └─ final result + confidence + language
   │
   ├─ turn engine decides: is this a real turn, a backchannel, noise, or an interrupt?
   │
   ├─ retrieval (already built) → Bedrock Nova ─► streaming tokens
   │                                              │
   │                                              └─ split into sentences as they arrive
   │                                                                    │
   ├─ each sentence → Polly ─► audio chunk ───────────────────────────────┘
   │
   └─ audio plays; the next sentence is already synthesising
```

The single most important property: **nothing waits for the whole answer.** The first sentence
is spoken while the model is still writing the third. This is the difference between 1.2 s and
4 s, and it costs nothing but care.

---

## Decisions

### 1. The turn engine is a pure state machine, with no knowledge of audio or AWS

Every hard bug in a voice agent lives in turn-taking: the agent interrupts itself, the mic
locks up, the greeting collides with the first question, an interrupt is ignored, a cough is
answered as a question. These are **logic** bugs, but in most implementations they can only be
reproduced by talking to a live system with a microphone — which is why they take weeks.

So `turn.ts` takes events (`speech-started`, `transcript`, `agent-speaking`, …) and returns
decisions (`answer this`, `interrupt`, `ignore`, `ask them to repeat`). No sockets, no audio
buffers, no SDK calls. Every rule below is a unit test that runs in milliseconds.

Everything else is an adapter around it.

### 2. Transport is pluggable, and ships on a WebSocket first

[ADR 0002](adr/0002-webrtc-chime-transport.md) chose Amazon Chime SDK for WebRTC, on the
strength of one argument: echo cancellation. That argument is still correct and the ADR is not
being thrown out — see [ADR 0006](adr/0006-pluggable-voice-transport.md) for the amendment.

What changed is the sequencing. Chime has no first-class server-side participant SDK for Node;
joining a Chime meeting from a Fargate container is a genuine sub-project. Meanwhile *none* of
the work above depends on how the bytes arrive. So audio transport goes behind a narrow
interface, a WebSocket implementation ships first, and WebRTC is a swap — not a rewrite —
once there are real numbers to justify its cost.

The honest limitation: on a WebSocket with browser echo cancellation, a visitor on **laptop
speakers at high volume** may hear the agent interrupt itself. On headphones, or at normal
volume, it is fine. The merchant-facing preview — the first thing that needs to work — is a
merchant with headphones on.

### 3. One voice per session, locked

Resolve the Polly voice once per language per session, then freeze it. Re-resolving per
sentence, or varying prosody per sentence to convey emotion, makes the voice audibly change
character mid-conversation. This is a real, shipped-and-regretted bug from the aibuilder
project; it is not a hypothetical.

### 4. Say something while thinking

If retrieval and generation will take 900 ms, the visitor should not hear 900 ms of nothing.
A short, language-correct acknowledgement ("let me check that") played at the moment the turn
is accepted removes the entire perceived gap, and costs one cached Polly call.

This is a perceived-latency fix, not a real one. It is also the largest single improvement
available, which is why it is in the plan rather than in "polish".

### 5. Partials are for the interface, finals are for the answer

Transcribe emits a running guess that changes as you speak. Show it — a live transcript makes
the agent feel attentive. **Never** answer from it. A partial that says "how do I return" and
a final that says "how do I return something I didn't order" are different questions.

---

## Rules taken from the aibuilder project

Yug's other voice product (Shopify, LiveKit + Pipecat, in production) paid for these in
debugging time. They are re-derived here as behaviour, not copied as code — the two systems
share no language or framework.

| Rule | What goes wrong without it |
| --- | --- |
| **Bot-speaking frames are handled before anything else** | The greeting collides with the first user turn and the mic locks up. |
| **Echo window: inputs suppressed while the agent speaks, plus a grace period after** | The agent hears its own tail through the speakers and answers itself. |
| **Grace period is one cancellable timer, never several** | Sentence-by-sentence playback starts a timer per sentence; they race, and the mic unmutes mid-answer. |
| **A real barge-in clears the echo window immediately** | The interrupting words get swallowed by the guard that exists to block echo. |
| **"mm-hmm", "haan", "okay" are not interruptions** | The agent stops every time someone agrees with it. |
| **But a single word that isn't on that list — "Price?" — is a real question** | Over-eager filtering makes short questions vanish. |
| **Sentence splitting must handle 。！？ with no trailing space** | Japanese and Chinese answers never split, so the whole reply synthesises as one block and first-audio latency triples. |
| **Low STT confidence → ask them to repeat, in their language** | The agent confidently answers a question nobody asked. |
| **Trust the STT's own language tag over guessing from the words** | Guessing pins the agent to the first language heard and it can't follow a switch. |
| **Cap concurrent sessions per container and refuse past it** | One container accepts sessions until it dies, killing every call on it. |
| **Numbers and markdown must be cleaned before synthesis** | "**₹1,299**" is read aloud as asterisks and digits. |

---

## Build order

Each step is usable and tested before the next begins.

1. **`voice-protocol.ts`** — the typed message contract between browser and server.
2. **`turn.ts`** — the turn-taking state machine. Pure, exhaustively unit-tested.
3. **`speech.ts`** — answer text → speakable sentences. Markdown stripped, numbers spoken,
   sentence boundaries correct in every launch language.
4. **`transcribe.ts`** — Transcribe streaming adapter. Partials, finals, confidence, per-utterance language.
5. **`polly.ts`** — Polly adapter with the session voice lock and a cached acknowledgement.
6. **`session.ts`** — the orchestrator. Transport-agnostic; owns per-stage timing.
7. **WebSocket route** — session token, origin check, binary audio both ways.
8. **Widget voice UI** — mic, waveform, live transcript, interrupt, text fallback always reachable.
9. **Smoke test** — audio in, audio out, timings asserted. `npm run smoke:voice`.

Steps 1–6 need no deploy and no browser. They are where the product is.

**All nine are done.** `npm run smoke:voice` runs the whole path against real AWS and a real
database: it creates an agent, publishes it, exchanges an embed key for a session token from one
website and is refused from another, speaks a question synthesised by Polly into the socket,
and asserts the transcript, the grounding, the absence of markdown in the spoken answer, the
latency, and that pressing stop actually stops the audio. 24 checks.

---

## What is explicitly *not* in Phase 3

- Telephony. A phone number is a different product with different regulations.
- Voice cloning or custom voices.
- Speaker identification / "who is talking".
- Recording storage. Off by default; recordings are biometric-adjacent and need consent
  handling that belongs in Phase 4 with the rest of the compliance work.
