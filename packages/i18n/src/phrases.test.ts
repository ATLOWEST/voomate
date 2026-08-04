import { describe, expect, it } from 'vitest';
import { getPhrase, getPhrases, hasPhrases, languagesWithPhrases } from './phrases.js';
import { listLanguages } from './resolve.js';

describe('getPhrases', () => {
  it('returns the language’s own words', () => {
    expect(getPhrases('hi-IN').acknowledge[0]).toBe('एक सेकंड।');
  });

  it('keys on the base language, not the dialect', () => {
    // A Spanish speaker in the US and one in Mexico want the same words.
    expect(getPhrases('es-MX')).toBe(getPhrases('es-US'));
  });

  it('is case-insensitive about the code', () => {
    expect(getPhrases('DE-DE')).toBe(getPhrases('de-DE'));
  });

  it('falls back to English rather than leaving a silent gap', () => {
    expect(getPhrases('sv-SE').acknowledge).toEqual(getPhrases('en-US').acknowledge);
  });

  it('reports honestly whether a language is really covered', () => {
    expect(hasPhrases('ja-JP')).toBe(true);
    expect(hasPhrases('sv-SE')).toBe(false);
  });
});

describe('getPhrase', () => {
  it('rotates through the variants', () => {
    // Random selection repeats; a visitor who hears "let me check" three times running
    // notices the loop. An index the caller advances never does.
    const first = getPhrase('en-US', 'acknowledge', 0);
    const second = getPhrase('en-US', 'acknowledge', 1);
    expect(first).not.toBe(second);
  });

  it('wraps around rather than running out', () => {
    expect(getPhrase('en-US', 'acknowledge', 0)).toBe(getPhrase('en-US', 'acknowledge', 4));
  });

  it('handles a large or negative index without crashing', () => {
    expect(getPhrase('en-US', 'acknowledge', 9999)).toBeTruthy();
    expect(getPhrase('en-US', 'acknowledge', -3)).toBeTruthy();
  });

  it('has every kind for every covered language', () => {
    for (const language of languagesWithPhrases()) {
      for (const kind of ['acknowledge', 'repair', 'trouble', 'languageFallback'] as const) {
        expect(getPhrase(language, kind), `${language}/${kind}`).toBeTruthy();
      }
    }
  });

  it('keeps acknowledgements short enough to cover a wait rather than be one', () => {
    // An acknowledgement is spoken over the silence while retrieval runs. Longer than the
    // wait and it stops covering the wait and becomes the wait.
    for (const language of languagesWithPhrases()) {
      for (const phrase of getPhrases(language).acknowledge) {
        expect(phrase.length, `${language}: "${phrase}"`).toBeLessThanOrEqual(40);
      }
    }
  });

  it('offers more than one acknowledgement everywhere, so rotation has somewhere to go', () => {
    for (const language of languagesWithPhrases()) {
      expect(getPhrases(language).acknowledge.length, language).toBeGreaterThan(1);
    }
  });
});

describe('phrase coverage', () => {
  it('covers every language the product can actually speak', () => {
    // A launch language that hears an English "one moment" is the most obvious possible tell
    // that there is a machine on the other end, at exactly the moment the visitor is waiting.
    const speakable = listLanguages()
      .filter((language) => language.support !== 'text-only' && language.tier === 'launch')
      .map((language) => language.code);

    const missing = speakable.filter((code) => !hasPhrases(code));
    expect(missing).toEqual([]);
  });
});
