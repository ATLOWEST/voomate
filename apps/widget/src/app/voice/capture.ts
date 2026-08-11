/**
 * The microphone: permission, capture, and 20 ms frames on the wire.
 *
 * The path is deliberately short — worklet block → resample → 16-bit → frame → send — because
 * every hop between the visitor's mouth and the socket is latency the answer inherits.
 *
 * Echo cancellation is requested but not assumed. When a browser refuses it, the agent's own
 * voice comes back through the microphone and the server hears it as the visitor interrupting;
 * the agent then stops mid-sentence for no reason, forever. Rather than hide that, `capture`
 * reports what it actually got, and the session widens its echo guard to match.
 */
import { VOICE_SAMPLE_RATE } from '@voomate/core/voice-protocol';
import { Framer, Resampler, floatToPcm16, framePeak } from './audio.js';

export interface CaptureHandlers {
  /** One 20 ms frame, ready for the socket. */
  onFrame: (frame: Int16Array) => void;
  /** Peak level 0..1, for the meter. Called at frame rate; keep it cheap. */
  onLevel?: (level: number) => void;
}

export interface CaptureStartResult {
  /** The rate the browser actually gave us, before resampling. Useful in logs, not in logic. */
  sampleRate: number;
  /**
   * True when the browser could not turn echo cancellation on. Sent to the server in `start`.
   */
  echoCancellationUnavailable: boolean;
}

/**
 * Why the microphone is unavailable, in terms the visitor can act on.
 *
 * The browser's own errors are not usable in a UI — `NotAllowedError` could mean "the visitor
 * pressed Block" or "this page is not on HTTPS", which need completely different advice.
 */
export type CaptureFailure =
  'denied' | 'no-microphone' | 'in-use' | 'insecure-context' | 'unsupported';

export class CaptureError extends Error {
  constructor(
    readonly reason: CaptureFailure,
    message: string,
  ) {
    super(message);
    this.name = 'CaptureError';
  }
}

const classify = (error: unknown): CaptureError => {
  if (!window.isSecureContext) {
    return new CaptureError(
      'insecure-context',
      'A microphone needs a secure connection. This page is not served over HTTPS.',
    );
  }

  const name = error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new CaptureError('denied', 'Microphone access was blocked for this site.');
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new CaptureError('no-microphone', 'No microphone was found.');
    case 'NotReadableError':
    case 'AbortError':
      return new CaptureError('in-use', 'The microphone is being used by another application.');
    default:
      return new CaptureError('unsupported', 'This browser cannot record audio.');
  }
};

export class MicrophoneCapture {
  private context: AudioContext | undefined;
  private stream: MediaStream | undefined;
  private node: AudioWorkletNode | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private resampler: Resampler | undefined;
  private readonly framer = new Framer();
  private muted = false;

  constructor(private readonly handlers: CaptureHandlers) {}

  get isRunning(): boolean {
    return this.node !== undefined;
  }

  /**
   * Muting stops frames leaving, but keeps the microphone open.
   *
   * Releasing the device instead would drop the browser's recording indicator, which reads as
   * "it stopped listening for good", and re-acquiring costs a permission round trip on some
   * browsers. The partial frame is dropped so unmuting does not splice two moments together.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.framer.reset();
  }

  async start(): Promise<CaptureStartResult> {
    if (this.isRunning) throw new Error('The microphone is already running.');

    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      throw classify(new Error('getUserMedia is unavailable'));
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: VOICE_SAMPLE_RATE,
        },
      });
    } catch (error) {
      throw classify(error);
    }

    try {
      // Ask for the rate we want. Most browsers oblige and the resampler becomes a no-op; the
      // ones that don't are handled rather than trusted.
      const context = new AudioContext({
        sampleRate: VOICE_SAMPLE_RATE,
        latencyHint: 'interactive',
      });
      // A gesture-started context can still come up suspended on iOS.
      if (context.state === 'suspended') await context.resume();

      await context.audioWorklet.addModule(new URL('./pcm-worklet.js', import.meta.url));

      const node = new AudioWorkletNode(context, 'pcm-tap', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
      });
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        this.consume(event.data);
      };

      const source = context.createMediaStreamSource(stream);
      source.connect(node);

      this.context = context;
      this.stream = stream;
      this.node = node;
      this.source = source;
      this.resampler = new Resampler(context.sampleRate);

      // What we asked for is not what we got. `getSettings` is the only honest answer, and some
      // browsers omit the field entirely — an unknown answer is treated as "not available",
      // because a slightly wide echo guard is a much smaller problem than an agent that stops
      // mid-sentence every time it hears itself.
      const settings = stream.getAudioTracks()[0]?.getSettings();

      return {
        sampleRate: context.sampleRate,
        echoCancellationUnavailable: settings?.echoCancellation !== true,
      };
    } catch (error) {
      // Never leave the microphone open, and the recording indicator on, after a failed start.
      for (const track of stream.getTracks()) track.stop();
      throw error instanceof CaptureError ? error : classify(error);
    }
  }

  async stop(): Promise<void> {
    this.node?.port.close();
    this.node?.disconnect();
    this.source?.disconnect();
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    await this.context?.close().catch(() => undefined);

    this.node = undefined;
    this.source = undefined;
    this.stream = undefined;
    this.context = undefined;
    this.resampler = undefined;
    this.framer.reset();
  }

  private consume(block: Float32Array): void {
    if (this.muted || this.resampler === undefined) return;

    const resampled = this.resampler.process(block);
    for (const frame of this.framer.push(floatToPcm16(resampled))) {
      this.handlers.onLevel?.(framePeak(frame));
      this.handlers.onFrame(frame);
    }
  }
}
