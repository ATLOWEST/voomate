/**
 * The verified AWS language capability matrix, as data.
 *
 * Sourced from the Amazon Polly and Amazon Transcribe documentation on 2026-08-02 — see
 * docs/languages.md for the reasoning and the full citation. AWS adds voices and streaming
 * languages regularly; re-verify against the live docs before adding an entry or promoting
 * a language's tier, rather than trusting memory or this file's age.
 *
 * This is the ONLY place these facts should live. Nothing downstream — dashboard language
 * pickers, the voice orchestrator, onboarding copy — should hardcode a voice ID or a
 * "does X support streaming" assumption. Import from here.
 */
import type { LanguageDefinition } from './types.js';

// --- The 10 launch languages -------------------------------------------------------------

const LAUNCH_LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    baseLanguage: 'en',
    stt: 'full',
    ttsCode: 'en-US',
    voices: [
      { id: 'Danielle', gender: 'female', tiers: ['generative', 'long-form', 'neural'] },
      { id: 'Matthew', gender: 'male', tiers: ['generative', 'neural'] },
      { id: 'Joanna', gender: 'female', tiers: ['generative', 'neural', 'standard'] },
      { id: 'Ruth', gender: 'female', tiers: ['generative', 'long-form', 'neural'] },
      { id: 'Stephen', gender: 'male', tiers: ['generative', 'neural'] },
    ],
    support: 'voice-premium',
    tier: 'launch',
  },
  {
    code: 'en-IN',
    name: 'English (India)',
    nativeName: 'English (India)',
    baseLanguage: 'en',
    stt: 'full',
    ttsCode: 'en-IN',
    voices: [
      {
        id: 'Kajal',
        gender: 'female',
        tiers: ['generative', 'neural'],
        bilingualWith: ['hi-IN'],
      },
      { id: 'Aditi', gender: 'female', tiers: ['standard'], bilingualWith: ['hi-IN'] },
    ],
    support: 'voice-premium',
    tier: 'launch',
    note:
      'Kajal is fully bilingual with Hindi and handles Hinglish code-switching natively, ' +
      'including mid-sentence. See docs/languages.md.',
  },
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    baseLanguage: 'hi',
    stt: 'full',
    ttsCode: 'hi-IN',
    voices: [
      {
        id: 'Kajal',
        gender: 'female',
        tiers: ['neural'],
        bilingualWith: ['en-IN'],
      },
      { id: 'Aditi', gender: 'female', tiers: ['standard'], bilingualWith: ['en-IN'] },
    ],
    support: 'voice-standard',
    tier: 'launch',
    note: 'Pair with en-IN (not en-US) for Hinglish code-switching via the bilingual Kajal voice.',
  },
  {
    code: 'es-US',
    name: 'Spanish (US)',
    nativeName: 'Español (EE. UU.)',
    baseLanguage: 'es',
    stt: 'full',
    ttsCode: 'es-US',
    voices: [
      { id: 'Lupe', gender: 'female', tiers: ['generative', 'neural', 'standard'] },
      { id: 'Pedro', gender: 'male', tiers: ['generative', 'neural'] },
    ],
    support: 'voice-premium',
    tier: 'launch',
  },
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    baseLanguage: 'pt',
    stt: 'full',
    ttsCode: 'pt-BR',
    voices: [{ id: 'Camila', gender: 'female', tiers: ['generative', 'neural', 'standard'] }],
    support: 'voice-premium',
    tier: 'launch',
  },
  {
    code: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    baseLanguage: 'fr',
    stt: 'full',
    ttsCode: 'fr-FR',
    voices: [
      { id: 'Léa', gender: 'female', tiers: ['generative', 'neural', 'standard'] },
      { id: 'Rémi', gender: 'male', tiers: ['generative', 'neural'] },
      { id: 'Ambre', gender: 'female', tiers: ['generative'] },
      { id: 'Florian', gender: 'male', tiers: ['generative'] },
    ],
    support: 'voice-premium',
    tier: 'launch',
  },
  {
    code: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    baseLanguage: 'de',
    stt: 'full',
    ttsCode: 'de-DE',
    voices: [
      { id: 'Vicki', gender: 'female', tiers: ['generative', 'neural', 'standard'] },
      { id: 'Daniel', gender: 'male', tiers: ['generative', 'neural'] },
      { id: 'Lennart', gender: 'male', tiers: ['generative'] },
    ],
    support: 'voice-premium',
    tier: 'launch',
  },
  {
    code: 'ar-AE',
    name: 'Arabic (Gulf)',
    nativeName: 'العربية (الخليج)',
    baseLanguage: 'ar',
    stt: 'full',
    ttsCode: 'ar-AE',
    voices: [
      { id: 'Hala', gender: 'female', tiers: ['neural'] },
      { id: 'Zayd', gender: 'male', tiers: ['neural'] },
    ],
    support: 'voice-standard',
    tier: 'launch',
    rtl: true,
    note:
      'Hala and Zayd are documented as fully bilingual voices (alongside Aditi/Kajal); ' +
      'verify the exact paired English dialect against current Polly docs before relying ' +
      'on mid-sentence code-switching the way Kajal supports for Hindi.',
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Mandarin)',
    nativeName: '中文（普通话）',
    baseLanguage: 'zh',
    stt: 'full',
    // Polly's code for Mandarin is `cmn-CN`, not `zh-CN` — Transcribe and Polly disagree
    // here. Conflating them silently is a real bug source, so it's captured explicitly.
    ttsCode: 'cmn-CN',
    voices: [{ id: 'Zhiyu', gender: 'female', tiers: ['neural', 'standard'] }],
    support: 'voice-standard',
    tier: 'launch',
  },
  {
    code: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    baseLanguage: 'ja',
    stt: 'full',
    ttsCode: 'ja-JP',
    voices: [
      { id: 'Takumi', gender: 'male', tiers: ['neural', 'standard'] },
      { id: 'Kazuha', gender: 'female', tiers: ['neural'] },
      { id: 'Tomoko', gender: 'female', tiers: ['neural'] },
    ],
    support: 'voice-standard',
    tier: 'launch',
  },
];

// --- Free extras: Generative-tier, fully capable, not part of the marketed launch set ---

const EXTRA_LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: 'en-GB',
    name: 'English (UK)',
    nativeName: 'English (UK)',
    baseLanguage: 'en',
    stt: 'full',
    ttsCode: 'en-GB',
    voices: [
      { id: 'Amy', gender: 'female', tiers: ['generative', 'neural', 'standard'] },
      { id: 'Brian', gender: 'male', tiers: ['generative', 'neural', 'standard'] },
    ],
    support: 'voice-premium',
    tier: 'extra',
  },
  {
    code: 'en-AU',
    name: 'English (Australia)',
    nativeName: 'English (Australia)',
    baseLanguage: 'en',
    stt: 'full',
    ttsCode: 'en-AU',
    voices: [{ id: 'Olivia', gender: 'female', tiers: ['generative', 'neural'] }],
    support: 'voice-premium',
    tier: 'extra',
  },
  {
    code: 'it-IT',
    name: 'Italian',
    nativeName: 'Italiano',
    baseLanguage: 'it',
    stt: 'full',
    ttsCode: 'it-IT',
    voices: [
      { id: 'Bianca', gender: 'female', tiers: ['generative', 'neural'] },
      { id: 'Beatrice', gender: 'female', tiers: ['generative'] },
      { id: 'Adriano', gender: 'male', tiers: ['neural'] },
    ],
    support: 'voice-premium',
    tier: 'extra',
  },
  {
    code: 'ko-KR',
    name: 'Korean',
    nativeName: '한국어',
    baseLanguage: 'ko',
    stt: 'full',
    ttsCode: 'ko-KR',
    voices: [{ id: 'Seoyeon', gender: 'female', tiers: ['generative', 'neural', 'standard'] }],
    support: 'voice-premium',
    tier: 'extra',
  },
  {
    code: 'nl-NL',
    name: 'Dutch',
    nativeName: 'Nederlands',
    baseLanguage: 'nl',
    stt: 'full',
    ttsCode: 'nl-NL',
    voices: [{ id: 'Laura', gender: 'female', tiers: ['generative', 'neural'] }],
    support: 'voice-premium',
    tier: 'extra',
  },
  {
    code: 'pl-PL',
    name: 'Polish',
    nativeName: 'Polski',
    baseLanguage: 'pl',
    stt: 'full',
    ttsCode: 'pl-PL',
    voices: [
      { id: 'Ewa', gender: 'female', tiers: ['generative'] },
      { id: 'Ola', gender: 'female', tiers: ['generative', 'neural'] },
    ],
    support: 'voice-premium',
    tier: 'extra',
  },
  {
    code: 'es-MX',
    name: 'Spanish (Mexico)',
    nativeName: 'Español (México)',
    baseLanguage: 'es',
    stt: 'full',
    ttsCode: 'es-MX',
    voices: [
      { id: 'Mia', gender: 'female', tiers: ['generative', 'neural', 'standard'] },
      { id: 'Andrés', gender: 'male', tiers: ['generative', 'neural'] },
    ],
    support: 'voice-premium',
    tier: 'extra',
  },
];

// --- Text-only tier: streaming STT exists, Polly has no voice ---------------------------
//
// Transcribe hears these. Polly cannot speak them. An agent can read and answer in text,
// but voice output must fall back to a language it can actually speak — see
// resolve.ts#resolveSpeakableLanguage. This tier exists specifically so we never silently
// promise a spoken Indian regional language we cannot deliver.

const TEXT_ONLY_LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    baseLanguage: 'bn',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Bengali. Text responses only.',
  },
  {
    code: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    baseLanguage: 'ta',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Tamil. Text responses only.',
  },
  {
    code: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    baseLanguage: 'te',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Telugu. Text responses only.',
  },
  {
    code: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    baseLanguage: 'mr',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Marathi. Text responses only.',
  },
  {
    code: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    baseLanguage: 'gu',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Gujarati. Text responses only.',
  },
  {
    code: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    baseLanguage: 'kn',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Kannada. Text responses only.',
  },
  {
    code: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    baseLanguage: 'ml',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Malayalam. Text responses only.',
  },
  {
    code: 'pa-IN',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    baseLanguage: 'pa',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Punjabi. Text responses only.',
  },
  {
    code: 'tr-TR',
    name: 'Turkish',
    nativeName: 'Türkçe',
    baseLanguage: 'tr',
    stt: 'region-limited',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note:
      'Polly offers only a Standard-tier Turkish voice; treated as text-only for the ' +
      'premium bar. Revisit if Standard-tier voice becomes acceptable for a given merchant.',
  },
  {
    code: 'ru-RU',
    name: 'Russian',
    nativeName: 'Русский',
    baseLanguage: 'ru',
    stt: 'full',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note:
      'Polly offers only Standard-tier Russian voices; treated as text-only for the ' +
      'premium bar.',
  },
  {
    code: 'vi-VN',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    baseLanguage: 'vi',
    stt: 'full',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Vietnamese. Text responses only.',
  },
  {
    code: 'th-TH',
    name: 'Thai',
    nativeName: 'ไทย',
    baseLanguage: 'th',
    stt: 'full',
    voices: [],
    support: 'text-only',
    tier: 'text-only',
    note: 'No Polly voice exists for Thai. Text responses only.',
  },
];

export const LANGUAGE_REGISTRY: readonly LanguageDefinition[] = [
  ...LAUNCH_LANGUAGES,
  ...EXTRA_LANGUAGES,
  ...TEXT_ONLY_LANGUAGES,
];

/** The default candidate set a brand-new agent starts with. */
export const DEFAULT_LANGUAGE_CODES = ['en-US'] as const;

/** The two voices that make Hinglish work. Referenced directly because they're load-bearing. */
export const HINGLISH_BILINGUAL_VOICE = 'Kajal';
export const HINGLISH_LANGUAGE_PAIR = ['en-IN', 'hi-IN'] as const;
