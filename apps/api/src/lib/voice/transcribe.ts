/**
 * Microphone audio in, words out — Amazon Transcribe streaming.
 *
 * The awkward shape of this file comes from the AWS API: `StartStreamTranscription` wants an
 * async *iterable* of audio it can pull from, but audio arrives pushed at us from a WebSocket
 * whenever the browser feels like sending it. The queue in the middle is the adapter between
 * those two worlds, and most of the care here is about what happens when the two sides run at
 * different speeds or one of them dies.
 *
 * Three things this deliberately does that the naive version does not:
 *
 * - **Drops old audio, never buffers it.** If AWS stalls, holding onto seconds of speech to
 *   replay later is worse than useless — by the time it transcribes, the visitor has moved on
 *   and the answer lands against the wrong question. A bounded queue that discards the oldest
 *   frames keeps the transcript honest about *now*.
 * - **Keeps the stream alive through silence.** Transcribe hangs up after ~15 seconds without
 *   audio. A muted visitor sends nothing, so silence is synthesised to hold the connection —
 *   otherwise the first thing they say after unmuting is lost to a reconnect.
 * - **Reconnects itself.** A dropped stream mid-conversation is a normal network event, not an
 *   error the visitor should have to reload the page to recover from.
 *
 * Language is whatever Transcribe says it is. It hears the audio; a text-based guess is
 * working from a lossy transcription of the same thing, and loses whenever the two disagree.
 */
import {
  BadRequestException,
  ConflictException,
  LimitExceededException,
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
  type AudioStream,
  type LanguageCode,
  type Result,
} from '@aws-sdk/client-transcribe-streaming';
import { VOICE_SAMPLE_RATE } from '@voomate/core';
import type { TranscribeStreamConfig } from '@voomate/i18n';
import { getAwsConfig } from '../../config.js';

let client: TranscribeStreamingClient | undefined;

const getClient = (): TranscribeStreamingClient => {
  const aws = getAwsConfig();
  // Same reasoning as `embeddings.ts`: the default credential chain resolves the Fargate task
  // role in production and the static `.env` keys locally. Passing credentials explicitly here
  // would work on a laptop and break in the deployed path.
  client ??= new TranscribeStreamingClient({ region: aws.TRANSCRIBE_REGION });
  return client;
};

/** What the turn engine consumes. Shapes match `VoiceEvent` in `turn.ts` on purpose. */
export interface TranscriptionResult {
  text: string;
  /** Partials are for the screen only. Only finals are ever answered. */
  final: boolean;
  /** Mean confidence over the spoken words, 0–1. Absent on partials. */
  confidence?: number;
  /** Transcribe's own verdict on what language this was. */
  language?: string;
  at: number;
}

export interface TranscriptionHandlers {
  onResult: (result: TranscriptionResult) => void;
  /** Fatal only. Recoverable stream drops are retried internally and never surface here. */
  onError: (error: Error) => void;
  /** Fired on each successful (re)connection — useful for logging a reconnect rate. */
  onOpen?: () => void;
}

export interface TranscriptionOptions {
  config: TranscribeStreamConfig;
  /**
   * How much audio to gather before sending. AWS asks for 50–1000 ms per chunk; below that,
   * event-stream framing overhead starts to dominate the payload. 100 ms costs up to 100 ms of
   * transcript latency, which is invisible next to Transcribe's own ~500 ms end-of-speech
   * detection — and barge-in does not wait for the transcript anyway (see `vad.ts`).
   */
  chunkMs?: number;
  /** Audio held before old frames start being dropped. Two seconds is already a disaster. */
  maxQueuedMs?: number;
  /** Silence is sent if nothing is written for this long, to hold the connection open. */
  keepaliveMs?: number;
  /** Reconnect attempts before giving up and calling `onError`. */
  maxReconnects?: number;
}

const DEFAULTS = {
  chunkMs: 100,
  maxQueuedMs: 2000,
  keepaliveMs: 2000,
  maxReconnects: 3,
} as const;

/**
 * PCM samples to bytes, little-endian, explicitly.
 *
 * Reinterpreting the buffer directly would be faster and would work on every machine we will
 * ever deploy to — and would produce pure noise on a big-endian one, with no error anywhere to
 * explain why. At 16 kHz this loop is not measurable.
 */
export const pcmToBytes = (samples: Int16Array): Uint8Array => {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i += 1) view.setInt16(i * 2, samples[i]!, true);
  return bytes;
};

/**
 * A push-in, pull-out audio queue with a hard ceiling.
 *
 * When full it drops from the front. That is the right end to drop from: the newest audio is
 * the audio the visitor is waiting to have understood.
 */
class AudioQueue {
  private readonly frames: Uint8Array[] = [];
  private waiting: ((value: Uint8Array | null) => void) | undefined;
  private closed = false;
  private droppedFrames = 0;

  constructor(private readonly maxFrames: number) {}

  get dropped(): number {
    return this.droppedFrames;
  }

  push(frame: Uint8Array): void {
    if (this.closed) return;

    if (this.waiting !== undefined) {
      const resolve = this.waiting;
      this.waiting = undefined;
      resolve(frame);
      return;
    }

    this.frames.push(frame);
    while (this.frames.length > this.maxFrames) {
      this.frames.shift();
      this.droppedFrames += 1;
    }
  }

  close(): void {
    this.closed = true;
    if (this.waiting !== undefined) {
      const resolve = this.waiting;
      this.waiting = undefined;
      resolve(null);
    }
  }

  /** Next frame, or null once closed and drained. */
  async next(): Promise<Uint8Array | null> {
    const queued = this.frames.shift();
    if (queued !== undefined) return queued;
    if (this.closed) return null;
    return new Promise<Uint8Array | null>((resolve) => {
      this.waiting = resolve;
    });
  }
}

/**
 * Re-cuts arriving audio to a fixed chunk size.
 *
 * The browser sends whatever its audio worklet produces — 128 samples on Chrome, something
 * else on Safari, and a ragged partial frame whenever the socket splits a message. AWS wants
 * chunks in a sane size range. Neither side should have to know about the other, so the
 * seam sits here, and it has to handle a chunk boundary landing in the middle of an input
 * frame without losing or duplicating a single sample.
 */
export class Rechunker {
  private readonly pending: Int16Array[] = [];
  private buffered = 0;

  constructor(private readonly chunkSamples: number) {}

  /** Samples held back, waiting for enough to make a full chunk. */
  get pendingSamples(): number {
    return this.buffered;
  }

  /** Add input; get back every whole chunk it completed. */
  push(samples: Int16Array): Int16Array[] {
    if (samples.length > 0) {
      this.pending.push(samples);
      this.buffered += samples.length;
    }

    const chunks: Int16Array[] = [];
    while (this.buffered >= this.chunkSamples) chunks.push(this.take(this.chunkSamples));
    return chunks;
  }

  /** The short final chunk at end of stream. Transcribe accepts an undersized last chunk. */
  flush(): Int16Array | null {
    return this.buffered === 0 ? null : this.take(this.buffered);
  }

  private take(count: number): Int16Array {
    const out = new Int16Array(count);
    let filled = 0;

    while (filled < count) {
      const head = this.pending[0]!;
      const needed = count - filled;

      if (head.length <= needed) {
        out.set(head, filled);
        filled += head.length;
        this.pending.shift();
      } else {
        out.set(head.subarray(0, needed), filled);
        // `subarray` is a view, not a copy — the leftover tail costs nothing to keep.
        this.pending[0] = head.subarray(needed);
        filled += needed;
      }
    }

    this.buffered -= count;
    return out;
  }
}

/**
 * Mean confidence across the *spoken words* of a result.
 *
 * Punctuation items carry their own confidence, and it is routinely low — Transcribe is far
 * less sure about a comma than about a word. Averaging them in drags a perfectly clear
 * utterance under the repair threshold and makes the agent say "sorry, could you repeat that"
 * to someone who spoke plainly.
 */
export const meanConfidence = (result: Result): number | undefined => {
  const items = result.Alternatives?.[0]?.Items ?? [];
  const scored = items.filter(
    (item) => item.Type === 'pronunciation' && typeof item.Confidence === 'number',
  );
  if (scored.length === 0) return undefined;
  return scored.reduce((sum, item) => sum + (item.Confidence ?? 0), 0) / scored.length;
};

/**
 * Which language Transcribe thinks this was.
 *
 * With multi-language identification the verdict arrives as scored candidates rather than a
 * single code, and the top score is the answer. With a single configured language there is no
 * verdict at all, and the caller's configured language stands.
 */
export const resultLanguage = (result: Result): string | undefined => {
  if (result.LanguageCode !== undefined) return result.LanguageCode;

  const candidates = result.LanguageIdentification ?? [];
  if (candidates.length === 0) return undefined;

  const best = candidates.reduce((top, candidate) =>
    (candidate.Score ?? 0) > (top.Score ?? 0) ? candidate : top,
  );
  return best.LanguageCode;
};

/** True for errors where retrying just fails again — bad config, blown quota. */
const isFatal = (error: unknown): boolean =>
  error instanceof BadRequestException ||
  error instanceof LimitExceededException ||
  error instanceof ConflictException;

/** AWS errors are terse and blame the caller. Say which caller mistake it usually is. */
const describe = (error: unknown): Error => {
  if (error instanceof BadRequestException) {
    return new Error(
      `Transcribe rejected the stream: ${error.message}. This is almost always a sample rate ` +
        `other than ${String(VOICE_SAMPLE_RATE)} Hz, or two dialects of one language in the ` +
        `candidate list.`,
    );
  }
  if (error instanceof LimitExceededException) {
    return new Error(
      'Transcribe concurrent stream limit reached. Sessions must be capped below the account ' +
        'quota, not left to fail at the visitor.',
    );
  }
  return error instanceof Error ? error : new Error(String(error));
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A connection this short did not really work.
 *
 * The reconnect counter resets on a healthy stream, which is right — a single drop after an
 * hour should not count against a drop tomorrow. But resetting on *any* successful open turns
 * a connection that dies every two seconds into an infinite reconnect loop that never trips
 * the limit. It has to survive a while to count as recovered.
 */
const HEALTHY_CONNECTION_MS = 10_000;

export class TranscriptionStream {
  private readonly options: Required<TranscriptionOptions>;
  private readonly framesPerChunk: number;
  private readonly silentChunk: Uint8Array;

  private queue: AudioQueue;
  private readonly rechunker: Rechunker;
  private keepalive: NodeJS.Timeout | undefined;
  private reconnects = 0;
  private stopped = false;
  private running = false;

  constructor(
    options: TranscriptionOptions,
    private readonly handlers: TranscriptionHandlers,
  ) {
    this.options = { ...DEFAULTS, ...options };
    this.framesPerChunk = Math.round((VOICE_SAMPLE_RATE * this.options.chunkMs) / 1000);
    this.silentChunk = new Uint8Array(this.framesPerChunk * 2);
    this.rechunker = new Rechunker(this.framesPerChunk);
    this.queue = new AudioQueue(Math.ceil(this.options.maxQueuedMs / this.options.chunkMs));
  }

  /** Frames discarded because AWS could not keep up. Non-zero means degraded transcription. */
  get droppedFrames(): number {
    return this.queue.dropped;
  }

  /** Start consuming. Resolves when the stream ends; it does not block `write`. */
  start(): void {
    if (this.running) return;
    this.running = true;
    void this.run();
    this.armKeepalive();
  }

  /**
   * Hand over captured audio. Accepts any frame size — it is re-cut to `chunkMs` here, because
   * the browser's frame size is the browser's business.
   */
  write(samples: Int16Array): void {
    if (this.stopped) return;

    this.armKeepalive();
    for (const chunk of this.rechunker.push(samples)) this.queue.push(pcmToBytes(chunk));
  }

  /** Stop cleanly: flush what is buffered, let Transcribe finalise, then close. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.keepalive !== undefined) clearTimeout(this.keepalive);

    const tail = this.rechunker.flush();
    if (tail !== null) this.queue.push(pcmToBytes(tail));
    this.queue.close();
  }

  /**
   * Hold the connection open through silence.
   *
   * Restarted on every write, so it only ever fires when audio has genuinely stopped — a muted
   * visitor, or a browser that pauses capture in a background tab.
   */
  private armKeepalive(): void {
    if (this.keepalive !== undefined) clearTimeout(this.keepalive);
    if (this.stopped || this.options.keepaliveMs <= 0) return;

    this.keepalive = setTimeout(() => {
      this.queue.push(this.silentChunk);
      this.armKeepalive();
    }, this.options.keepaliveMs);
    this.keepalive.unref();
  }

  private async *audioStream(): AsyncGenerator<AudioStream> {
    for (;;) {
      const chunk = await this.queue.next();
      if (chunk === null) return;
      yield { AudioEvent: { AudioChunk: chunk } };
    }
  }

  private async run(): Promise<void> {
    for (;;) {
      let lastError: unknown;

      try {
        await this.connect();
        // Returning without `stop()` means AWS hung up on us. Not an error — Transcribe ends
        // streams on its own schedule — but the visitor is still talking, so reconnect.
      } catch (error) {
        lastError = error;
        if (isFatal(error)) {
          if (!this.stopped) this.handlers.onError(describe(error));
          return;
        }
      }

      if (this.stopped) return;

      this.reconnects += 1;
      if (this.reconnects > this.options.maxReconnects) {
        this.handlers.onError(
          lastError === undefined
            ? new Error('Transcription stream could not be kept open.')
            : describe(lastError),
        );
        return;
      }

      // Audio captured during the gap is gone. Replaying it would put stale words into a
      // conversation that has already moved on, which reads as the agent mishearing.
      this.queue.close();
      this.queue = new AudioQueue(Math.ceil(this.options.maxQueuedMs / this.options.chunkMs));
      await sleep(200 * this.reconnects);
    }
  }

  private async connect(): Promise<void> {
    const { config } = this.options;
    const openedAt = Date.now();

    const response = await getClient().send(
      new StartStreamTranscriptionCommand({
        ...(config.languageCode !== undefined
          ? { LanguageCode: config.languageCode as LanguageCode }
          : {}),
        ...(config.identifyLanguage === true ? { IdentifyLanguage: true } : {}),
        ...(config.identifyMultipleLanguages === true ? { IdentifyMultipleLanguages: true } : {}),
        ...(config.languageOptions !== undefined
          ? { LanguageOptions: config.languageOptions.join(',') }
          : {}),
        ...(config.preferredLanguage !== undefined
          ? { PreferredLanguage: config.preferredLanguage as LanguageCode }
          : {}),
        MediaEncoding: config.mediaEncoding,
        MediaSampleRateHertz: VOICE_SAMPLE_RATE,
        AudioStream: this.audioStream(),
      }),
    );

    this.handlers.onOpen?.();

    try {
      for await (const event of response.TranscriptResultStream ?? []) {
        for (const result of event.TranscriptEvent?.Transcript?.Results ?? []) {
          const text = result.Alternatives?.[0]?.Transcript?.trim();
          if (text === undefined || text.length === 0) continue;

          this.handlers.onResult({
            text,
            final: result.IsPartial !== true,
            // Confidence on a partial is meaningless — the words are still changing.
            ...(result.IsPartial === true ? {} : { confidence: meanConfidence(result) }),
            language: resultLanguage(result) ?? config.languageCode,
            at: Date.now(),
          });
        }
      }
    } finally {
      if (Date.now() - openedAt >= HEALTHY_CONNECTION_MS) this.reconnects = 0;
    }
  }
}

/** Test seam. The module-level client is cached, and tests must not inherit one. */
export const __resetTranscribeClient = (): void => {
  client = undefined;
};
