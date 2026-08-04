import { describe, expect, it } from 'vitest';
import { VoiceActivityDetector, frameDb } from './vad.js';

const FRAME_MS = 20;
const FRAME_SAMPLES = 320; // 20 ms at 16 kHz

/** A frame of the given amplitude, 0–1 relative to full scale. */
const tone = (amplitude: number): Int16Array => {
  const frame = new Int16Array(FRAME_SAMPLES);
  for (let i = 0; i < frame.length; i += 1) {
    frame[i] = Math.round(Math.sin((i / 16) * Math.PI * 2) * amplitude * 32767);
  }
  return frame;
};

const silence = (): Int16Array => new Int16Array(FRAME_SAMPLES);

/** Low-level hiss — the room, not a person. */
const roomNoise = (): Int16Array => {
  const frame = new Int16Array(FRAME_SAMPLES);
  for (let i = 0; i < frame.length; i += 1) frame[i] = Math.round((Math.random() - 0.5) * 200);
  return frame;
};

const feed = (vad: VoiceActivityDetector, frame: Int16Array, count: number): (string | null)[] =>
  Array.from({ length: count }, () => vad.push(frame, FRAME_MS));

describe('frameDb', () => {
  it('reports silence as negative infinity', () => {
    expect(frameDb(silence())).toBe(Number.NEGATIVE_INFINITY);
  });

  it('reports a loud frame near full scale', () => {
    expect(frameDb(tone(1))).toBeGreaterThan(-5);
  });

  it('reports a quiet frame far below full scale', () => {
    expect(frameDb(tone(0.01))).toBeLessThan(-35);
  });

  it('is louder for a louder frame', () => {
    expect(frameDb(tone(0.5))).toBeGreaterThan(frameDb(tone(0.05)));
  });
});

describe('VoiceActivityDetector calibration', () => {
  it('listens to the room before listening to anyone in it', () => {
    const vad = new VoiceActivityDetector({ calibrationMs: 500 });
    expect(vad.isCalibrating).toBe(true);

    // Nothing is reported during the window, however loud it gets.
    expect(feed(vad, tone(0.5), 25).every((event) => event === null)).toBe(true);
    expect(vad.isCalibrating).toBe(false);
  });

  it('learns the room from its quietest moment, not its average', () => {
    // If someone talks through calibration, an average learns their voice as the room and the
    // detector goes deaf for the session. The minimum lands in a gap between their words.
    const vad = new VoiceActivityDetector({ calibrationMs: 500 });
    for (let i = 0; i < 25; i += 1) vad.push(i % 5 === 0 ? tone(0.001) : tone(0.4), FRAME_MS);
    expect(vad.noiseFloor).toBeLessThan(-50);
  });

  it('recovers when the floor was learned wrong and it is stuck hearing speech', () => {
    // Capture that starts mid-noise learns a floor far below the room, so every frame reads as
    // speech and the visitor can never be heard to stop. Nobody talks this long without a
    // breath, so continuous speech past the ceiling means the floor is wrong, not that the
    // visitor is still going.
    const vad = new VoiceActivityDetector({ calibrationMs: 500, maxSpeechMs: 1000 });
    feed(vad, silence(), 25); // Learns nothing — floor stays at the initial guess.

    const hum = tone(0.02); // Louder than the guessed floor, so it reads as speech.
    expect(feed(vad, hum, 3)).toContain('speech-started');
    expect(feed(vad, hum, 60)).toContain('speech-stopped');

    // And having re-learned the room, that same hum is now correctly ignored.
    feed(vad, hum, 25);
    expect(feed(vad, hum, 20).every((event) => event === null)).toBe(true);
    expect(vad.isSpeaking).toBe(false);
  });

  it('does not trip the stuck-detector watchdog during a normal long answer', () => {
    const vad = new VoiceActivityDetector({ calibrationMs: 500, maxSpeechMs: 15_000 });
    feed(vad, roomNoise(), 25);
    feed(vad, tone(0.3), 2);
    // Ten seconds of continuous speech is long but plausible; it must not be interrupted.
    expect(feed(vad, tone(0.3), 500)).not.toContain('speech-stopped');
    expect(vad.isSpeaking).toBe(true);
  });
});

describe('VoiceActivityDetector', () => {
  it('says nothing is happening in silence', () => {
    const vad = new VoiceActivityDetector();
    expect(feed(vad, silence(), 50).every((event) => event === null)).toBe(true);
    expect(vad.isSpeaking).toBe(false);
  });

  it('detects speech within two frames', () => {
    const vad = new VoiceActivityDetector();
    feed(vad, roomNoise(), 25); // Let the floor settle to the room.
    const events = feed(vad, tone(0.3), 3);
    expect(events).toContain('speech-started');
    // 40 ms is the whole point — this is what makes barge-in feel instant.
    expect(events.indexOf('speech-started')).toBeLessThanOrEqual(1);
  });

  it('announces speech only once, not on every loud frame', () => {
    const vad = new VoiceActivityDetector();
    feed(vad, roomNoise(), 25);
    const events = feed(vad, tone(0.3), 40);
    expect(events.filter((event) => event === 'speech-started')).toHaveLength(1);
  });

  it('does not end the turn at a pause inside a sentence', () => {
    const vad = new VoiceActivityDetector({ hangoverMs: 500 });
    feed(vad, roomNoise(), 25);
    feed(vad, tone(0.3), 10);
    // A 200 ms breath between clauses. Cutting someone off here is the classic complaint.
    expect(feed(vad, silence(), 10)).not.toContain('speech-stopped');
    expect(vad.isSpeaking).toBe(true);
  });

  it('ends the turn after a real pause', () => {
    const vad = new VoiceActivityDetector({ hangoverMs: 500 });
    feed(vad, roomNoise(), 25);
    feed(vad, tone(0.3), 10);
    expect(feed(vad, silence(), 30)).toContain('speech-stopped');
    expect(vad.isSpeaking).toBe(false);
  });

  it('ignores a single click', () => {
    const vad = new VoiceActivityDetector({ onsetFrames: 2 });
    feed(vad, roomNoise(), 25);
    expect(vad.push(tone(0.5), FRAME_MS)).toBeNull();
    expect(feed(vad, silence(), 3).every((event) => event === null)).toBe(true);
    expect(vad.isSpeaking).toBe(false);
  });

  it('adapts to a noisy room instead of triggering on the air conditioner', () => {
    const vad = new VoiceActivityDetector();
    // Steady noise well above digital silence. A fixed threshold would call this speech.
    const hum = tone(0.02);
    feed(vad, hum, 60);
    const events = feed(vad, hum, 20);
    expect(events.every((event) => event === null)).toBe(true);
    expect(vad.isSpeaking).toBe(false);
  });

  it('still hears speech over that same noisy room', () => {
    const vad = new VoiceActivityDetector();
    const hum = tone(0.02);
    feed(vad, hum, 60);
    expect(feed(vad, tone(0.3), 4)).toContain('speech-started');
  });

  it('does not let speech raise the noise floor mid-sentence', () => {
    const vad = new VoiceActivityDetector();
    feed(vad, roomNoise(), 25);
    const floorBefore = vad.noiseFloor;
    // A long, loud sentence. If speech fed the floor, the detector would go deaf partway
    // through and report the speaker stopping while they were still talking.
    feed(vad, tone(0.4), 100);
    expect(vad.noiseFloor).toBeCloseTo(floorBefore, 5);
    expect(vad.isSpeaking).toBe(true);
  });

  it('treats a very quiet frame as silence whatever the floor has adapted to', () => {
    const vad = new VoiceActivityDetector({ absoluteFloorDb: -55 });
    // A near-silent room drags the floor very low; -60 dB must still not count as speech.
    feed(vad, silence(), 100);
    expect(feed(vad, tone(0.0005), 10).every((event) => event === null)).toBe(true);
  });

  it('forgets everything on reset', () => {
    const vad = new VoiceActivityDetector();
    feed(vad, roomNoise(), 25);
    feed(vad, tone(0.3), 5);
    expect(vad.isSpeaking).toBe(true);

    vad.reset();
    expect(vad.isSpeaking).toBe(false);
    expect(vad.noiseFloor).toBe(-50);
  });

  it('handles an empty frame without crashing', () => {
    const vad = new VoiceActivityDetector();
    expect(vad.push(new Int16Array(0), FRAME_MS)).toBeNull();
  });
});
