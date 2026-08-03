/**
 * Language resolution logic.
 *
 * Turns a merchant's configured language set into a valid Transcribe streaming
 * configuration and a Polly voice selection — enforcing the AWS constraints that would
 * otherwise surface as confusing runtime failures or, worse, silently wrong transcripts.
 */
import { LANGUAGE_REGISTRY } from './registry.js';
import type { LanguageDefinition, PollyVoice, SttLanguageCode, VoiceTier } from './types.js';
import { VOICE_TIERS } from './types.js';

const BY_CODE = new Map<SttLanguageCode, LanguageDefinition>(
  LANGUAGE_REGISTRY.map((lang) => [lang.code, lang]),
);

export const getLanguage = (code: SttLanguageCode): LanguageDefinition | undefined =>
  BY_CODE.get(code);

export const isKnownLanguage = (code: string): boolean => BY_CODE.has(code);

export const listLanguages = (tier?: LanguageDefinition['tier']): readonly LanguageDefinition[] =>
  tier === undefined ? LANGUAGE_REGISTRY : LANGUAGE_REGISTRY.filter((l) => l.tier === tier);

/** Languages we can actually speak — excludes the text-only tier. */
export const listSpeakableLanguages = (): readonly LanguageDefinition[] =>
  LANGUAGE_REGISTRY.filter((l) => l.support !== 'text-only');

// --- Validation --------------------------------------------------------------------------

/**
 * Transcribe caps how many candidate languages a stream may declare. The hard API limit is
 * higher, but accuracy degrades well before it: with a wide candidate list, Transcribe is
 * forced to pick the *closest* match to whatever is spoken and will confidently return a
 * wrong-language transcript. We cap lower than AWS does, on purpose.
 */
export const MAX_CANDIDATE_LANGUAGES = 4;
export const RECOMMENDED_MAX_CANDIDATE_LANGUAGES = 3;

export interface LanguageSetProblem {
  severity: 'error' | 'warning';
  code:
    | 'unknown_language'
    | 'duplicate_base_language'
    | 'too_many_languages'
    | 'accuracy_risk'
    | 'not_speakable'
    | 'empty_set';
  message: string;
  /** The language codes involved, so the dashboard can highlight the right chips. */
  languages: readonly SttLanguageCode[];
}

export interface LanguageSetValidation {
  valid: boolean;
  problems: readonly LanguageSetProblem[];
}

/**
 * Validate a merchant's candidate language set.
 *
 * The rule that surprises people: Transcribe streaming allows only ONE DIALECT PER LANGUAGE
 * in a single stream. `en-IN` + `hi-IN` is fine (different languages). `en-US` + `en-IN` is
 * rejected by AWS (same base language, two dialects). This is why an India-market agent must
 * commit to `en-IN` rather than also carrying `en-US`.
 */
export const validateLanguageSet = (codes: readonly SttLanguageCode[]): LanguageSetValidation => {
  const problems: LanguageSetProblem[] = [];

  if (codes.length === 0) {
    return {
      valid: false,
      problems: [
        {
          severity: 'error',
          code: 'empty_set',
          message: 'An agent must have at least one language configured.',
          languages: [],
        },
      ],
    };
  }

  const unknown = codes.filter((code) => !BY_CODE.has(code));
  if (unknown.length > 0) {
    problems.push({
      severity: 'error',
      code: 'unknown_language',
      message: `Not a supported language: ${unknown.join(', ')}.`,
      languages: unknown,
    });
  }

  const known = codes.filter((code): code is SttLanguageCode => BY_CODE.has(code));

  // One dialect per base language — an AWS constraint, not a preference.
  const byBase = new Map<string, SttLanguageCode[]>();
  for (const code of known) {
    const base = BY_CODE.get(code)!.baseLanguage;
    byBase.set(base, [...(byBase.get(base) ?? []), code]);
  }
  for (const [base, group] of byBase) {
    if (group.length > 1) {
      problems.push({
        severity: 'error',
        code: 'duplicate_base_language',
        message:
          `Only one dialect per language is allowed in a single voice session. ` +
          `You selected ${group.join(' and ')}, which are both "${base}". Pick one.`,
        languages: group,
      });
    }
  }

  if (known.length > MAX_CANDIDATE_LANGUAGES) {
    problems.push({
      severity: 'error',
      code: 'too_many_languages',
      message:
        `An agent can have at most ${MAX_CANDIDATE_LANGUAGES} languages. ` +
        `Beyond that, speech recognition accuracy degrades sharply.`,
      languages: known,
    });
  } else if (known.length > RECOMMENDED_MAX_CANDIDATE_LANGUAGES) {
    problems.push({
      severity: 'warning',
      code: 'accuracy_risk',
      message:
        `${known.length} languages will reduce recognition accuracy. ` +
        `${RECOMMENDED_MAX_CANDIDATE_LANGUAGES} or fewer is strongly recommended.`,
      languages: known,
    });
  }

  const textOnly = known.filter((code) => BY_CODE.get(code)!.support === 'text-only');
  if (textOnly.length > 0) {
    problems.push({
      severity: 'warning',
      code: 'not_speakable',
      message:
        `No voice is available for ${textOnly.join(', ')}. The agent will understand and ` +
        `reply in text, but will speak in the fallback language.`,
      languages: textOnly,
    });
  }

  return { valid: !problems.some((p) => p.severity === 'error'), problems };
};

// --- Transcribe configuration --------------------------------------------------------------

export interface TranscribeStreamConfig {
  /** Set when exactly one language is configured — no identification needed. */
  languageCode?: SttLanguageCode;
  /** Single-language identification: pick the dominant language from the candidates. */
  identifyLanguage?: boolean;
  /** Multi-language identification: handles code-switching mid-conversation. */
  identifyMultipleLanguages?: boolean;
  languageOptions?: readonly SttLanguageCode[];
  preferredLanguage?: SttLanguageCode;
  /**
   * Multi-language identification supports PCM **only**. Single-language identification also
   * accepts FLAC. Getting this wrong produces an opaque AWS error, so it is derived here
   * rather than configured by hand at the call site.
   */
  mediaEncoding: 'pcm' | 'flac';
}

/**
 * Build the Transcribe streaming configuration for an agent.
 *
 * @param codes             the agent's configured candidate languages
 * @param preferred         the agent's default language — speeds up identification
 * @param enableCodeSwitching whether visitors are expected to mix languages mid-sentence
 */
export const buildTranscribeConfig = (
  codes: readonly SttLanguageCode[],
  preferred?: SttLanguageCode,
  enableCodeSwitching = true,
): TranscribeStreamConfig => {
  const validation = validateLanguageSet(codes);
  if (!validation.valid) {
    const detail = validation.problems
      .filter((p) => p.severity === 'error')
      .map((p) => p.message)
      .join(' ');
    throw new Error(`Cannot build a Transcribe config from an invalid language set. ${detail}`);
  }

  // A single language needs no identification at all — this is both faster and more
  // accurate, and it sidesteps the "minimum two language options" requirement.
  if (codes.length === 1) {
    return { languageCode: codes[0]!, mediaEncoding: 'pcm' };
  }

  // Two or more candidates: identification is required. Multi-language identification is
  // what makes Hinglish (and any other code-switching) transcribe correctly instead of
  // being forced into a single dominant language.
  return {
    ...(enableCodeSwitching ? { identifyMultipleLanguages: true } : { identifyLanguage: true }),
    languageOptions: codes,
    ...(preferred !== undefined && codes.includes(preferred)
      ? { preferredLanguage: preferred }
      : {}),
    // PCM is mandatory for multi-language ID; we use it for both paths to keep the audio
    // pipeline uniform rather than branching the encoder on a config flag.
    mediaEncoding: 'pcm',
  };
};

/** Does this language set represent a code-switching pair we have a bilingual voice for? */
export const findBilingualVoice = (
  codes: readonly SttLanguageCode[],
): { voice: PollyVoice; languages: readonly SttLanguageCode[] } | undefined => {
  for (const code of codes) {
    const lang = BY_CODE.get(code);
    if (!lang) continue;
    for (const voice of lang.voices) {
      if (!voice.bilingualWith) continue;
      // The voice's partner languages must also be in the configured set for it to help.
      const partnersPresent = voice.bilingualWith.every((partner) =>
        codes.some((c) => BY_CODE.get(c)?.ttsCode === partner || c === partner),
      );
      if (partnersPresent) {
        return { voice, languages: [code, ...voice.bilingualWith] };
      }
    }
  }
  return undefined;
};

// --- Voice resolution ----------------------------------------------------------------------

export interface ResolvedVoice {
  voiceId: string;
  /** Polly language code — may differ from the STT code (Mandarin: zh-CN vs cmn-CN). */
  languageCode: string;
  engine: VoiceTier;
  /** True when we fell short of the requested tier — the dashboard discloses this. */
  degraded: boolean;
  /** True when this voice handles mixed-language input natively. */
  bilingual: boolean;
}

const bestTier = (voice: PollyVoice, ceiling: VoiceTier): VoiceTier | undefined => {
  const ceilingIndex = VOICE_TIERS.indexOf(ceiling);
  for (let i = ceilingIndex; i < VOICE_TIERS.length; i += 1) {
    const tier = VOICE_TIERS[i]!;
    if (voice.tiers.includes(tier)) return tier;
  }
  return undefined;
};

/**
 * Pick the voice to speak a given language with.
 *
 * Walks down from the requested quality ceiling to the best engine actually available, and
 * reports whether it had to degrade — so the dashboard can tell the merchant *before* they
 * ship, rather than letting them discover it from a customer complaint.
 */
export const resolveVoice = (
  code: SttLanguageCode,
  options: { preferredVoiceId?: string; ceiling?: VoiceTier } = {},
): ResolvedVoice | undefined => {
  const lang = BY_CODE.get(code);
  if (!lang || lang.voices.length === 0 || lang.ttsCode === undefined) return undefined;

  const ceiling = options.ceiling ?? 'generative';

  const candidates =
    options.preferredVoiceId !== undefined
      ? [
          ...lang.voices.filter((v) => v.id === options.preferredVoiceId),
          ...lang.voices.filter((v) => v.id !== options.preferredVoiceId),
        ]
      : lang.voices;

  for (const voice of candidates) {
    const engine = bestTier(voice, ceiling);
    if (engine === undefined) continue;
    return {
      voiceId: voice.id,
      languageCode: lang.ttsCode,
      engine,
      degraded: engine !== ceiling,
      bilingual: voice.bilingualWith !== undefined,
    };
  }

  return undefined;
};

/**
 * Decide which language to actually *speak* in.
 *
 * When a visitor uses a text-only language (Bengali, Tamil, ...), we can understand them and
 * reply in text, but Polly cannot voice it. Rather than failing or emitting garbage, we fall
 * back to a language we speak well — and the caller is expected to have the agent say so.
 */
export const resolveSpeakableLanguage = (
  detected: SttLanguageCode,
  configured: readonly SttLanguageCode[],
  fallback: SttLanguageCode,
): { language: SttLanguageCode; isFallback: boolean } => {
  const lang = BY_CODE.get(detected);
  if (lang && lang.support !== 'text-only' && configured.includes(detected)) {
    return { language: detected, isFallback: false };
  }

  const speakable = configured.find((code) => BY_CODE.get(code)?.support !== 'text-only');
  return { language: speakable ?? fallback, isFallback: true };
};
