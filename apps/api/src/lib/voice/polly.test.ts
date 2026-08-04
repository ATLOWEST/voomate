import { describe, expect, it } from 'vitest';
import { lockVoice, pcmDurationMs } from './polly.js';

describe('pcmDurationMs', () => {
  it('measures one second of 16 kHz mono audio', () => {
    expect(pcmDurationMs(Buffer.alloc(16_000 * 2))).toBe(1000);
  });

  it('measures a short clip', () => {
    expect(pcmDurationMs(Buffer.alloc(16_000))).toBe(500);
  });

  it('measures an empty buffer as no time at all', () => {
    expect(pcmDurationMs(Buffer.alloc(0))).toBe(0);
  });
});

describe('lockVoice', () => {
  it('picks a bilingual voice when it covers the whole language set', () => {
    // The Hinglish case. Kajal speaks both, so a visitor switching language mid-conversation
    // hears the same person follow them rather than a different one answer.
    const voice = lockVoice(['en-IN', 'hi-IN'], 'en-IN');
    expect(voice.voiceId).toBe('Kajal');
    expect(voice.bilingual).toBe(true);
  });

  it('picks the same bilingual voice whichever language is the default', () => {
    // The lock must not depend on which of the two the merchant happened to list first.
    expect(lockVoice(['hi-IN', 'en-IN'], 'hi-IN').voiceId).toBe('Kajal');
  });

  it('uses the best generative engine when the voice offers one', () => {
    const voice = lockVoice(['en-US'], 'en-US');
    expect(voice.engine).toBe('generative');
    expect(voice.degraded).toBe(false);
  });

  it('reports the degradation when only a lesser engine exists', () => {
    // Hindi alone has no generative voice. Answering anyway is right; hiding it is not — the
    // merchant should learn this from their dashboard, not from a customer complaint.
    const voice = lockVoice(['hi-IN'], 'hi-IN');
    expect(voice.engine).toBe('neural');
    expect(voice.degraded).toBe(true);
  });

  it("honours the merchant's explicitly chosen voice over bilingual cleverness", () => {
    const voice = lockVoice(['en-IN', 'hi-IN'], 'en-IN', { preferredVoiceId: 'Aditi' });
    expect(voice.voiceId).toBe('Aditi');
  });

  it('falls back to a speakable language when the default cannot be voiced', () => {
    // Bengali has streaming recognition but no Polly voice. The session still opens; the
    // caller is expected to have the agent say which language it will answer in.
    const voice = lockVoice(['bn-IN', 'en-IN'], 'bn-IN');
    expect(voice.voiceId).toBeTruthy();
    expect(voice.languageCode).toBe('en-IN');
  });

  it('falls back when the default is not even in the configured set', () => {
    expect(lockVoice(['de-DE'], 'en-US').languageCode).toBe('de-DE');
  });

  it('refuses to open a session that could never speak', () => {
    // Failing loudly here is right: the caller must fall back to a text-only widget rather
    // than opening a voice session that will be silent.
    expect(() => lockVoice(['bn-IN', 'ta-IN'], 'bn-IN')).toThrow(/cannot speak/i);
  });

  it('respects a lowered quality ceiling', () => {
    const voice = lockVoice(['en-US'], 'en-US', { ceiling: 'neural' });
    expect(voice.engine).toBe('neural');
    expect(voice.degraded).toBe(false);
  });

  it('does not claim a bilingual voice when only one of its languages is configured', () => {
    // Kajal is listed against en-IN, but with no Hindi in the set there is nothing bilingual
    // about this session and nothing to gain from pretending otherwise.
    expect(lockVoice(['en-IN', 'fr-FR'], 'fr-FR').languageCode).toBe('fr-FR');
  });
});
