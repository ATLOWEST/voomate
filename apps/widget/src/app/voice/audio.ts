/**
 * The audio maths, kept away from the Web Audio API so it can be tested.
 *
 * Nothing here touches an `AudioContext`. That is deliberate: sample-rate conversion and frame
 * boundaries are exactly the kind of code that is wrong by one sample, and a bug of that shape
 * is inaudible in a unit test but sounds like a faint tick forty times a second in a real
 * conversation. Testable functions are the only way to be sure.
 *
 * Everything speaks the protocol's format: 16 kHz, mono, signed 16-bit little-endian.
 */
import { VOICE_FRAME_SAMPLES, VOICE_SAMPLE_RATE } from '@voomate/core/voice-protocol';

/**
 * Float samples (-1..1) to signed 16-bit.
 *
 * Clamped before scaling. A browser's microphone gain can exceed 1.0 on a loud voice, and
 * wrapping a Float32 of 1.2 into an Int16 turns the peak of a word into a full-scale click in
 * the opposite direction — audible, and it wrecks the noise floor the server's detector learns.
 */
export const floatToPcm16 = (input: Float32Array): Int16Array => {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]!));
    // Asymmetric on purpose: Int16 runs -32768..32767, so the two directions scale differently.
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
};

export const pcm16ToFloat = (input: Int16Array): Float32Array => {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) output[i] = input[i]! / 0x8000;
  return output;
};

/**
 * Resample a mono stream, keeping the fractional read position between calls.
 *
 * Most browsers honour a requested 16 kHz `AudioContext` and this never runs. Some do not —
 * Safari has historically given back 44.1 kHz regardless — and sending 44.1 kHz audio labelled
 * as 16 kHz does not fail: it transcribes as slow, garbled nonsense, which is a far more
 * expensive bug to find than a resampler.
 *
 * Linear interpolation. Downsampling this way aliases a little, but voice energy above 8 kHz is
 * almost nothing, and Transcribe is untroubled by it.
 */
export class Resampler {
  private readonly ratio: number;
  /** Fractional position in the *input* stream, carried across chunks. */
  private position = 0;
  /** The last sample of the previous chunk, so interpolation can span the boundary. */
  private previous = 0;
  private primed = false;

  constructor(
    private readonly inputRate: number,
    private readonly outputRate: number = VOICE_SAMPLE_RATE,
  ) {
    this.ratio = inputRate / outputRate;
  }

  get passthrough(): boolean {
    return this.inputRate === this.outputRate;
  }

  process(input: Float32Array): Float32Array {
    if (this.passthrough) return input;
    if (input.length === 0) return new Float32Array(0);

    const output: number[] = [];

    // The first chunk has no previous sample to interpolate from; start at its own first one.
    if (!this.primed) {
      this.previous = input[0]!;
      this.primed = true;
    }

    while (this.position < input.length) {
      const index = Math.floor(this.position);
      const fraction = this.position - index;
      // Index -1 means "the sample before this chunk", which is what `previous` holds.
      const before = index === 0 ? this.previous : input[index - 1]!;
      const after = input[index]!;
      output.push(before + (after - before) * fraction);
      this.position += this.ratio;
    }

    // Carry the remainder, so no sample is dropped or repeated at the chunk boundary.
    this.position -= input.length;
    this.previous = input[input.length - 1]!;

    return Float32Array.from(output);
  }

  reset(): void {
    this.position = 0;
    this.previous = 0;
    this.primed = false;
  }
}

/**
 * Gather samples into fixed-size frames.
 *
 * The browser hands out 128-sample blocks; the protocol wants 320. Without this, frames would
 * be whatever size the audio thread happened to produce, and the server's 20 ms voice detector
 * would be timing something other than 20 ms.
 */
export class Framer {
  private pending: Int16Array;
  private used = 0;

  constructor(private readonly frameSamples: number = VOICE_FRAME_SAMPLES) {
    this.pending = new Int16Array(frameSamples);
  }

  push(samples: Int16Array): Int16Array[] {
    const frames: Int16Array[] = [];
    let offset = 0;

    while (offset < samples.length) {
      const room = this.frameSamples - this.used;
      const take = Math.min(room, samples.length - offset);
      this.pending.set(samples.subarray(offset, offset + take), this.used);
      this.used += take;
      offset += take;

      if (this.used === this.frameSamples) {
        // A copy, not a view: the caller may hold this while the next frame is being filled.
        frames.push(this.pending.slice());
        this.used = 0;
      }
    }

    return frames;
  }

  reset(): void {
    this.used = 0;
  }
}

/**
 * Peak level of a frame, 0..1, for the microphone meter.
 *
 * Peak rather than RMS. RMS is the honest measure of loudness, but a meter driven by it barely
 * moves on speech, and a meter that does not move reads as "the microphone is not working" —
 * which is the single thing this indicator exists to disprove.
 */
export const framePeak = (frame: Int16Array): number => {
  let peak = 0;
  for (let i = 0; i < frame.length; i += 1) {
    const value = Math.abs(frame[i]!);
    if (value > peak) peak = value;
  }
  return peak / 0x8000;
};
