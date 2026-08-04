import { describe, expect, it } from 'vitest';
import { Framer, Resampler, floatToPcm16, framePeak, pcm16ToFloat } from './audio.js';

describe('floatToPcm16', () => {
  it('maps silence to silence', () => {
    expect(Array.from(floatToPcm16(new Float32Array([0, 0])))).toEqual([0, 0]);
  });

  it('maps full scale to the ends of the range', () => {
    const pcm = floatToPcm16(new Float32Array([1, -1]));
    expect(pcm[0]).toBe(32767);
    expect(pcm[1]).toBe(-32768);
  });

  it('clamps rather than wrapping', () => {
    // A loud voice with the browser's gain up produces samples past 1.0. Wrapping turns the
    // peak of a word into a full-scale click in the opposite direction.
    const pcm = floatToPcm16(new Float32Array([2.5, -3]));
    expect(pcm[0]).toBe(32767);
    expect(pcm[1]).toBe(-32768);
  });

  it('round-trips within one bit', () => {
    const original = new Float32Array([0, 0.25, -0.5, 0.75, -0.125]);
    const restored = pcm16ToFloat(floatToPcm16(original));
    for (let i = 0; i < original.length; i += 1) {
      expect(restored[i]).toBeCloseTo(original[i]!, 3);
    }
  });
});

describe('Resampler', () => {
  it('does nothing at all when the rates already match', () => {
    const resampler = new Resampler(16_000, 16_000);
    const input = new Float32Array([0.1, 0.2, 0.3]);
    expect(resampler.passthrough).toBe(true);
    expect(resampler.process(input)).toBe(input);
  });

  it('produces roughly the right number of samples going down', () => {
    // 48 kHz in, 16 kHz out: a third as many.
    const resampler = new Resampler(48_000);
    const output = resampler.process(new Float32Array(4800));
    expect(output.length).toBeGreaterThan(1590);
    expect(output.length).toBeLessThan(1610);
  });

  it('produces roughly the right number of samples going up', () => {
    const resampler = new Resampler(8000);
    const output = resampler.process(new Float32Array(800));
    expect(output.length).toBeGreaterThan(1590);
    expect(output.length).toBeLessThan(1610);
  });

  it('handles the awkward 44.1 kHz case', () => {
    // Safari's historical answer to "please give me 16 kHz". Not a whole-number ratio, which
    // is exactly why the read position has to carry across chunks.
    const resampler = new Resampler(44_100);
    const total = Array.from(
      { length: 10 },
      () => resampler.process(new Float32Array(4410)).length,
    ).reduce((sum, length) => sum + length, 0);

    // Ten chunks of 100 ms should be about a second of 16 kHz audio.
    expect(total).toBeGreaterThan(15_950);
    expect(total).toBeLessThan(16_050);
  });

  it('does not drift over many chunks', () => {
    // The failure this guards against is subtle: a resampler that restarts its position each
    // chunk loses a fraction of a sample every time, and the audio slowly runs ahead of the
    // transcript until words land against the wrong question.
    const resampler = new Resampler(48_000);
    let produced = 0;
    for (let i = 0; i < 500; i += 1) produced += resampler.process(new Float32Array(128)).length;

    const expected = (500 * 128 * 16_000) / 48_000;
    expect(Math.abs(produced - expected)).toBeLessThan(2);
  });

  it('interpolates across a chunk boundary rather than stepping', () => {
    // Downsampling a ramp should stay a ramp. A resampler that forgets the previous chunk's
    // last sample produces a small discontinuity at every boundary — a faint tick, hundreds of
    // times a minute.
    const resampler = new Resampler(32_000);
    const ramp = (start: number, length: number) =>
      Float32Array.from({ length }, (_, i) => (start + i) / 1000);

    const first = resampler.process(ramp(0, 100));
    const second = resampler.process(ramp(100, 100));

    const joined = [...first, ...second];
    for (let i = 1; i < joined.length; i += 1) {
      const step = joined[i]! - joined[i - 1]!;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(0.005);
    }
  });

  it('survives an empty chunk', () => {
    const resampler = new Resampler(48_000);
    expect(resampler.process(new Float32Array(0)).length).toBe(0);
  });
});

describe('Framer', () => {
  it('holds samples back until a whole frame exists', () => {
    const framer = new Framer(320);
    expect(framer.push(new Int16Array(128))).toEqual([]);
    expect(framer.push(new Int16Array(128))).toEqual([]);
    expect(framer.push(new Int16Array(128))).toHaveLength(1);
  });

  it('emits frames of exactly the requested size', () => {
    const framer = new Framer(320);
    const frames = framer.push(new Int16Array(1000));
    expect(frames).toHaveLength(3);
    for (const frame of frames) expect(frame.length).toBe(320);
  });

  it('loses no sample when a block spans a frame boundary', () => {
    // The browser's 128-sample blocks never line up with 320-sample frames, so every third
    // block straddles a boundary. A numbered ramp makes a dropped or duplicated sample visible.
    const framer = new Framer(320);
    const collected: number[] = [];
    let next = 1;

    for (let block = 0; block < 20; block += 1) {
      const samples = Int16Array.from({ length: 128 }, () => next++);
      for (const frame of framer.push(samples)) collected.push(...frame);
    }

    expect(collected).toEqual(Array.from({ length: collected.length }, (_, i) => i + 1));
  });

  it('emits copies, not views onto the buffer being refilled', () => {
    const framer = new Framer(4);
    const [frame] = framer.push(Int16Array.from([1, 2, 3, 4]));
    framer.push(Int16Array.from([9, 9, 9, 9]));
    expect(Array.from(frame!)).toEqual([1, 2, 3, 4]);
  });

  it('forgets a partial frame on reset', () => {
    const framer = new Framer(4);
    framer.push(new Int16Array(3));
    framer.reset();
    expect(framer.push(new Int16Array(3))).toEqual([]);
  });
});

describe('framePeak', () => {
  it('reports nothing for silence', () => {
    expect(framePeak(new Int16Array(320))).toBe(0);
  });

  it('reports full scale for a full-scale sample', () => {
    expect(framePeak(Int16Array.from([0, 0, -32768, 0]))).toBe(1);
  });

  it('reports the peak, not the average', () => {
    // A meter driven by the average barely moves on speech, and a meter that does not move
    // reads as a broken microphone.
    expect(framePeak(Int16Array.from([0, 0, 0, 16384]))).toBeCloseTo(0.5, 3);
  });
});
