/**
 * Language capability types.
 *
 * These model what AWS can actually *do* per language, not what we wish it could do.
 * See docs/languages.md for the sourcing and reasoning.
 */

/** Amazon Transcribe streaming language code. */
export type SttLanguageCode = string;

/** Amazon Polly language code. Not always equal to the Transcribe code — Mandarin is
 *  `zh-CN` for Transcribe but `cmn-CN` for Polly. Conflating them is a real bug source. */
export type TtsLanguageCode = string;

/**
 * Polly engine quality tiers, best first. This ordering is meaningful — `resolveVoice`
 * walks it downward to find the best available engine for a language.
 */
export const VOICE_TIERS = ['generative', 'long-form', 'neural', 'standard'] as const;
export type VoiceTier = (typeof VOICE_TIERS)[number];

/** How well we can actually serve a language end to end. */
export type SupportLevel =
  /** Streaming STT + Generative voice. The full premium experience. */
  | 'voice-premium'
  /** Streaming STT + Neural/Standard voice. Good, but audibly not generative. */
  | 'voice-standard'
  /** Streaming STT exists, but Polly has no voice. Text only — cannot be spoken. */
  | 'text-only';

/** Transcribe streaming availability. */
export type SttAvailability =
  /** Streaming in all regions we deploy to. */
  | 'full'
  /** Streaming, but excluded from some AWS regions (the docs' `streaming*` footnote). */
  | 'region-limited'
  /** No streaming support. Unusable for a live voice agent. */
  | 'none';

export interface PollyVoice {
  /** Polly voice ID, e.g. `Kajal`. */
  id: string;
  gender: 'female' | 'male';
  /** Engines this specific voice supports, best first. */
  tiers: readonly VoiceTier[];
  /**
   * Languages this voice speaks *fluently and interchangeably*, including mid-sentence.
   * Only Aditi, Kajal, Hala and Zayd are truly bilingual — everything else is a single
   * language. Non-bilingual voices can approximate a second language via the SSML `<lang>`
   * tag, but with the accent of their native language; that is not represented here
   * because it is not a bilingual capability.
   */
  bilingualWith?: readonly TtsLanguageCode[];
}

/**
 * `launch`     — one of the 10 languages the product ships and markets on day one.
 * `extra`      — Generative-tier and fully capable, enabled per agent with no new
 *                engineering, but not part of the marketed launch set.
 * `text-only`  — streaming STT exists; Polly has no voice. Never offered as a voice
 *                language. See docs/languages.md for why this matters for Indian
 *                regional languages specifically.
 */
export type LanguageTier = 'launch' | 'extra' | 'text-only';

export interface LanguageDefinition {
  /** Stable internal key. Uses the Transcribe code, since STT is where a session begins. */
  code: SttLanguageCode;
  /** English display name. */
  name: string;
  /** Native-script display name — what the merchant's own customers would recognise. */
  nativeName: string;
  /**
   * ISO 639 base language. Critical for the Transcribe constraint that a single stream may
   * contain only ONE dialect per language — `en-US` and `en-IN` share base `en` and
   * therefore cannot both be candidates in the same stream.
   */
  baseLanguage: string;
  stt: SttAvailability;
  /** Polly's code for this language, when a voice exists at all. */
  ttsCode?: TtsLanguageCode;
  voices: readonly PollyVoice[];
  support: SupportLevel;
  tier: LanguageTier;
  /** Right-to-left script — the widget needs this for layout. */
  rtl?: boolean;
  /** Shown in the dashboard when the language carries a caveat worth disclosing. */
  note?: string;
}
