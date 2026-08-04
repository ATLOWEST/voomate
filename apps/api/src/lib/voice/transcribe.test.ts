import type { Result } from '@aws-sdk/client-transcribe-streaming';
import { describe, expect, it } from 'vitest';
import { Rechunker, meanConfidence, pcmToBytes, resultLanguage } from './transcribe.js';

describe('pcmToBytes', () => {
  it('writes little-endian, which is what Transcribe expects', () => {
    // 0x0102 little-endian is [0x02, 0x01]. Getting this backwards transcribes as noise with
    // no error anywhere to explain it.
    expect([...pcmToBytes(Int16Array.from([0x0102]))]).toEqual([0x02, 0x01]);
  });

  it('round-trips a negative sample', () => {
    const bytes = pcmToBytes(Int16Array.from([-32768, 32767, -1]));
    const view = new DataView(bytes.buffer);
    expect([view.getInt16(0, true), view.getInt16(2, true), view.getInt16(4, true)]).toEqual([
      -32768, 32767, -1,
    ]);
  });

  it('produces two bytes per sample', () => {
    expect(pcmToBytes(new Int16Array(320))).toHaveLength(640);
  });

  it('handles an empty frame', () => {
    expect(pcmToBytes(new Int16Array(0))).toHaveLength(0);
  });
});

describe('Rechunker', () => {
  /** Samples numbered 1..n, so any loss or duplication is visible in the output. */
  const ramp = (from: number, count: number): Int16Array =>
    Int16Array.from({ length: count }, (_, i) => from + i);

  it('holds back an input frame smaller than a chunk', () => {
    const rechunker = new Rechunker(320);
    expect(rechunker.push(ramp(1, 128))).toEqual([]);
    expect(rechunker.pendingSamples).toBe(128);
  });

  it('emits a chunk once enough has arrived', () => {
    const rechunker = new Rechunker(320);
    rechunker.push(ramp(1, 128));
    rechunker.push(ramp(129, 128));
    const chunks = rechunker.push(ramp(257, 128));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(320);
    expect(rechunker.pendingSamples).toBe(64);
  });

  it('loses no sample when a chunk boundary falls mid-frame', () => {
    // The bug this guards: Chrome sends 128-sample frames, so a 320-sample chunk boundary
    // never lands on a frame edge. Dropping or repeating samples there is inaudible in
    // testing and shows up as a transcript that is subtly wrong.
    const rechunker = new Rechunker(320);
    const collected: number[] = [];

    for (let i = 0; i < 20; i += 1) {
      for (const chunk of rechunker.push(ramp(i * 128 + 1, 128))) collected.push(...chunk);
    }
    const tail = rechunker.flush();
    if (tail !== null) collected.push(...tail);

    expect(collected).toHaveLength(20 * 128);
    expect(collected).toEqual(Array.from({ length: 20 * 128 }, (_, i) => i + 1));
  });

  it('emits several chunks from one oversized frame', () => {
    const rechunker = new Rechunker(320);
    const chunks = rechunker.push(ramp(1, 1000));
    expect(chunks).toHaveLength(3);
    expect(rechunker.pendingSamples).toBe(40);
    expect([...chunks[1]!]).toEqual(Array.from({ length: 320 }, (_, i) => 321 + i));
  });

  it('returns the short tail on flush', () => {
    const rechunker = new Rechunker(320);
    rechunker.push(ramp(1, 100));
    expect(rechunker.flush()).toHaveLength(100);
  });

  it('flushes to null when nothing is held', () => {
    const rechunker = new Rechunker(320);
    rechunker.push(ramp(1, 320));
    expect(rechunker.flush()).toBeNull();
  });

  it('ignores an empty push', () => {
    const rechunker = new Rechunker(320);
    expect(rechunker.push(new Int16Array(0))).toEqual([]);
    expect(rechunker.pendingSamples).toBe(0);
  });
});

const result = (partial: Partial<Result>): Result => partial as Result;

describe('meanConfidence', () => {
  it('averages the spoken words', () => {
    const value = meanConfidence(
      result({
        Alternatives: [
          {
            Items: [
              { Type: 'pronunciation', Confidence: 0.9 },
              { Type: 'pronunciation', Confidence: 0.7 },
            ],
          },
        ],
      }),
    );
    expect(value).toBeCloseTo(0.8);
  });

  it('ignores punctuation, which is scored low even in clear speech', () => {
    // The bug this guards: averaging a 0.1-confidence comma into two clear words drops the
    // utterance under the repair threshold, and the agent asks a plain speaker to repeat.
    const value = meanConfidence(
      result({
        Alternatives: [
          {
            Items: [
              { Type: 'pronunciation', Confidence: 0.95 },
              { Type: 'punctuation', Confidence: 0.1 },
              { Type: 'pronunciation', Confidence: 0.95 },
            ],
          },
        ],
      }),
    );
    expect(value).toBeCloseTo(0.95);
  });

  it('is undefined when nothing carries a score', () => {
    expect(
      meanConfidence(result({ Alternatives: [{ Items: [{ Type: 'punctuation' }] }] })),
    ).toBeUndefined();
  });

  it('is undefined when there are no alternatives at all', () => {
    expect(meanConfidence(result({}))).toBeUndefined();
  });
});

describe('resultLanguage', () => {
  it('uses the explicit language code when Transcribe gives one', () => {
    expect(resultLanguage(result({ LanguageCode: 'hi-IN' }))).toBe('hi-IN');
  });

  it('picks the highest-scoring candidate under multi-language identification', () => {
    const language = resultLanguage(
      result({
        LanguageIdentification: [
          { LanguageCode: 'en-IN', Score: 0.31 },
          { LanguageCode: 'hi-IN', Score: 0.68 },
        ],
      }),
    );
    expect(language).toBe('hi-IN');
  });

  it('prefers the explicit code over the candidate list', () => {
    const language = resultLanguage(
      result({
        LanguageCode: 'en-IN',
        LanguageIdentification: [{ LanguageCode: 'hi-IN', Score: 0.99 }],
      }),
    );
    expect(language).toBe('en-IN');
  });

  it('is undefined when a single-language stream reports nothing', () => {
    expect(resultLanguage(result({}))).toBeUndefined();
  });

  it('handles a candidate with no score', () => {
    const language = resultLanguage(
      result({
        LanguageIdentification: [{ LanguageCode: 'en-US' }, { LanguageCode: 'de-DE', Score: 0.5 }],
      }),
    );
    expect(language).toBe('de-DE');
  });
});
