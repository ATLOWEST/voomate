/**
 * The speaker: turning a stream of PCM chunks back into continuous speech.
 *
 * The hard part is not playing audio, it is playing audio that arrives in pieces without a seam
 * between them. Each chunk is scheduled against a cursor in the audio clock rather than started
 * when it arrives, because "start now" for every chunk leaves a gap the size of the network
 * jitter between each pair of them — heard as a stutter on every sentence boundary.
 *
 * A small lead is held ahead of real time so a late chunk has somewhere to land. Too small and
 * the stream underruns; too large and it delays every interruption, because audio already
 * scheduled is audio the visitor is about to hear. This is why `cancel` exists and why the
 * server sends it: dropping scheduled audio is the only way to stop quickly.
 */
import { VOICE_SAMPLE_RATE } from '@soniq/core/voice-protocol';
import { pcm16ToFloat } from './audio.js';

/**
 * How far ahead of the audio clock a fresh stream starts.
 *
 * Straight cover for network jitter, paid once at the start of each answer. 80 ms is well under
 * the threshold where a reply feels delayed and comfortably more than the spread between chunks
 * on a normal connection.
 */
const LEAD_MS = 80;

/** Ducked volume. Quiet enough to talk over, loud enough to still be there if it was a cough. */
const DUCKED_GAIN = 0.15;

/** How long the volume takes to move. Instant changes click; this does not. */
const DUCK_RAMP_MS = 60;

export interface PlaybackHandlers {
  /** Fires when the queue drains — the visitor has actually finished hearing the answer. */
  onIdle?: () => void;
}

export class VoicePlayback {
  private context: AudioContext | undefined;
  private gain: GainNode | undefined;
  /** Sources scheduled but not finished. Held only so `cancel` can stop them. */
  private scheduled = new Set<AudioBufferSourceNode>();
  /** Where the next chunk goes, on the audio clock. */
  private cursor = 0;

  constructor(private readonly handlers: PlaybackHandlers = {}) {}

  /** True while sound is still due to leave the speaker. */
  get isPlaying(): boolean {
    return this.scheduled.size > 0;
  }

  /**
   * Must be called from a click or tap.
   *
   * Browsers refuse to start an audio context without a gesture, and the refusal is silent —
   * the context exists, `start()` succeeds, and nothing is heard.
   */
  async resume(): Promise<void> {
    const context = this.ensureContext();
    if (context.state === 'suspended') await context.resume();
  }

  /** Queue a chunk of 16 kHz mono PCM for playback. */
  enqueue(pcm: Int16Array): void {
    if (pcm.length === 0) return;

    const context = this.ensureContext();
    const buffer = context.createBuffer(1, pcm.length, VOICE_SAMPLE_RATE);
    buffer.getChannelData(0).set(pcm16ToFloat(pcm));

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain!);

    // Behind the clock means either this is the first chunk of an answer or the stream
    // underran. Either way the cursor is in the past; restart it ahead of now, since scheduling
    // in the past plays immediately and stacks chunks on top of each other.
    const now = context.currentTime;
    if (this.cursor < now) this.cursor = now + LEAD_MS / 1000;

    source.start(this.cursor);
    this.cursor += buffer.duration;

    this.scheduled.add(source);
    source.onended = () => {
      this.scheduled.delete(source);
      if (this.scheduled.size === 0) this.handlers.onIdle?.();
    };
  }

  /**
   * Stop immediately and discard everything queued.
   *
   * Stopping the sources is the whole point: without it the visitor keeps hearing the agent for
   * as long as the buffer is deep, which is exactly the "it doesn't stop when I talk" complaint.
   */
  cancel(): void {
    for (const source of this.scheduled) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already finished between the check and here. Nothing to do.
      }
      source.disconnect();
    }

    const had = this.scheduled.size > 0;
    this.scheduled.clear();
    this.cursor = 0;
    this.unduck();

    if (had) this.handlers.onIdle?.();
  }

  /** Attenuate without pausing — pausing and resuming produces a hiccup mid-word. */
  duck(): void {
    this.rampTo(DUCKED_GAIN);
  }

  unduck(): void {
    this.rampTo(1);
  }

  async close(): Promise<void> {
    this.cancel();
    await this.context?.close().catch(() => undefined);
    this.context = undefined;
    this.gain = undefined;
  }

  private rampTo(value: number): void {
    if (this.gain === undefined || this.context === undefined) return;
    const now = this.context.currentTime;
    // Anchor at the current value first, or the ramp starts from whatever was last *set* and
    // jumps if another ramp is still in flight.
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(value, now + DUCK_RAMP_MS / 1000);
  }

  private ensureContext(): AudioContext {
    if (this.context === undefined) {
      // Playback runs at the device's own rate. Asking for 16 kHz here would force the browser
      // to resample on output anyway, and its resampler is better than ours.
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.gain = this.context.createGain();
      this.gain.connect(this.context.destination);
    }
    return this.context;
  }
}
