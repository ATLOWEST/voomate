/**
 * The voice session protocol — browser ↔ server.
 *
 * One connection carries two kinds of traffic: **audio** as binary frames, and **control** as
 * JSON text frames. They share a socket rather than using two, because the ordering between
 * them is load-bearing: "stop speaking" must not overtake the audio it is stopping, and a
 * `turn-end` that arrives before the last audio chunk of that turn would cut a word in half.
 *
 * Audio format is fixed and not negotiated:
 *
 *   **16 kHz, mono, signed 16-bit little-endian PCM.**
 *
 * Fixed on purpose. Transcribe streaming requires PCM for multi-language identification (see
 * `buildTranscribeConfig`), 16 kHz is its native rate, and a format negotiation is a source of
 * silent, extremely confusing failures — the wrong sample rate does not error, it transcribes
 * gibberish. Polly is asked for the same format so nothing resamples anywhere in the path.
 *
 * Compression is deliberately absent. Opus would cut bandwidth ~10x, but it costs an encode
 * and a decode on the latency budget and needs a decoder in the widget. Revisit when there is
 * a measured bandwidth complaint, not before.
 */

/** Everything in the pipeline speaks this. Changing it is a protocol version bump. */
export const VOICE_SAMPLE_RATE = 16_000;
export const VOICE_CHANNELS = 1;
export const VOICE_PROTOCOL_VERSION = 1;

/**
 * How much audio rides in one frame.
 *
 * 20 ms is the WebRTC convention and the right trade: small enough that voice-activity
 * detection reacts within a frame, large enough that per-frame overhead stays negligible.
 * At 16 kHz mono 16-bit that is 320 samples / 640 bytes.
 */
export const VOICE_FRAME_MS = 20;
export const VOICE_FRAME_SAMPLES = (VOICE_SAMPLE_RATE * VOICE_FRAME_MS) / 1000;

// --- Browser → server ----------------------------------------------------------------------

export type ClientToServerMessage =
  /**
   * First message on the socket. The session token comes from `POST /v1/widget/session`, which
   * already did the embed-key and origin checks — this socket does not repeat them, it
   * verifies the token they produced.
   */
  | {
      type: 'start';
      protocolVersion: number;
      sessionToken: string;
      /** Preferred language, if the visitor picked one. Otherwise the agent decides. */
      language?: string;
      /** The page the visitor is on. Answers can be page-aware. */
      pageUrl?: string;
      /**
       * True when the browser could not enable echo cancellation. The turn engine widens its
       * echo guard in that case rather than pretending the microphone is clean.
       */
      echoCancellationUnavailable?: boolean;
    }
  /** The visitor pressed the stop/interrupt control, as opposed to speaking over the agent. */
  | { type: 'interrupt' }
  /** Microphone muted or unmuted locally. Muted means no audio frames will arrive. */
  | { type: 'mute'; muted: boolean }
  /**
   * A typed question on the voice connection. The text fallback must always be reachable —
   * some visitors cannot speak, some are in a quiet office, some have a broken microphone.
   */
  | { type: 'text'; content: string }
  | { type: 'end' };

// --- Server → browser ----------------------------------------------------------------------

export type ServerToClientMessage =
  /** Session accepted. Everything the UI needs to render itself before a word is spoken. */
  | {
      type: 'ready';
      protocolVersion: number;
      conversationId: string;
      /** Resolved voice, so the UI can show which one is speaking. */
      voice: { voiceId: string; languageCode: string; engine: string; degraded: boolean };
      /** Spoken automatically if present. */
      greeting?: string;
    }
  /** The server believes the visitor started speaking. Drives the "listening" indicator. */
  | { type: 'speech-started' }
  | { type: 'speech-stopped' }
  /**
   * Live transcript. `final: false` is a guess that will change — display it, never act on it.
   * `language` is the per-utterance language when the stream identifies multiple.
   */
  | { type: 'transcript'; text: string; final: boolean; language?: string; confidence?: number }
  /** An agent turn is starting. Every audio frame until `turn-end` belongs to this turn. */
  | { type: 'turn-start'; turnId: string }
  /** Answer text as it is generated, for the on-screen transcript. Audio follows separately. */
  | { type: 'answer-delta'; turnId: string; text: string }
  | {
      type: 'turn-end';
      turnId: string;
      text: string;
      citations?: readonly { title: string; url?: string }[];
      /** True when the agent declined to answer rather than inventing one. */
      ungrounded?: boolean;
      latency?: Readonly<Record<string, number>>;
    }
  /**
   * Stop playing immediately and discard any buffered audio for `turnId`.
   *
   * The client must drop what it has already received and not yet played. Without this the
   * visitor keeps hearing the agent for as long as their playback buffer is deep, which is
   * precisely the "it doesn't stop when I talk" complaint.
   */
  | { type: 'cancel'; turnId: string }
  /**
   * Drop the playback volume, but keep playing.
   *
   * Stage one of barge-in. The visitor has made a noise over the agent and we do not yet know
   * whether it was a question or "mm-hmm". Ducking is instant and reversible; stopping is
   * instant and not, so the cheap reversible thing happens first and the transcript decides
   * within a few hundred milliseconds whether it becomes a `cancel` or an `unduck`.
   *
   * The client must attenuate rather than pause: pausing and resuming produces an audible
   * hiccup mid-word, which is worse than the volume dip it was trying to avoid.
   */
  | { type: 'duck'; turnId: string }
  /** It was agreement or a cough. Return to full volume. */
  | { type: 'unduck'; turnId: string }
  /** The agent needs the visitor to repeat themselves — low confidence, not an error. */
  | { type: 'repeat-request'; text: string }
  | { type: 'error'; code: string; message: string; fatal: boolean }
  | { type: 'ended'; reason: string };

// --- Parsing -------------------------------------------------------------------------------

/**
 * Narrow an untrusted text frame to a client message.
 *
 * Returns `undefined` rather than throwing: a malformed frame on a public socket is an
 * expected event, not an exception. The socket stays open and the frame is dropped.
 */
export const parseClientMessage = (raw: string): ClientToServerMessage | undefined => {
  if (raw.length > 8192) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const message = parsed as { type?: unknown };
  if (typeof message.type !== 'string') return undefined;

  switch (message.type) {
    case 'start':
    case 'interrupt':
    case 'mute':
    case 'text':
    case 'end':
      return parsed as ClientToServerMessage;
    default:
      return undefined;
  }
};
