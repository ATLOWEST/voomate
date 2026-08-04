/**
 * Words in, audio out — Amazon Polly.
 *
 * Two ideas carry this file, and both are about the voice staying the same person.
 *
 * **The session voice lock.** A voice is chosen once, when the session opens, and does not
 * change for the life of that conversation. This matters more than it sounds like it should:
 * language detection is per-utterance and occasionally wrong, so a voice picked per-utterance
 * means a visitor can hear the agent change gender and accent halfway through an answer and
 * change back for the next sentence. It reads as a completely broken product, and it is caused
 * by a system working exactly as designed. Picking once makes it impossible.
 *
 * The lock is why voice selection prefers a genuinely bilingual voice — Kajal, Aditi, Hala,
 * Zayd — whenever the merchant's language set is one they cover. One person who speaks both
 * languages beats two people who each speak one.
 *
 * **The pre-warmed clip.** Everything the agent says between understanding a question and
 * answering it — "let me check", "sorry, could you repeat that" — is synthesised once at
 * session start and replayed from memory. Those are exactly the phrases whose whole purpose is
 * to arrive instantly, and paying a Polly round trip for one defeats it entirely.
 *
 * Plain text only, never SSML. Generative voices support almost none of it, and prosody
 * markup written for a neural voice silently degrades to nothing when the engine falls back —
 * so the markup is a maintenance cost that buys nothing on the tier we actually ship.
 */
import {
  EngineNotSupportedException,
  InvalidSampleRateException,
  LanguageNotSupportedException,
  PollyClient,
  SynthesizeSpeechCommand,
  type Engine,
  type LanguageCode,
  type OutputFormat,
  type VoiceId,
} from '@aws-sdk/client-polly';
import { VOICE_SAMPLE_RATE, internal } from '@soniq/core';
import {
  findBilingualVoice,
  getLanguage,
  getPhrase,
  resolveVoice,
  type PhraseKind,
  type ResolvedVoice,
  type SttLanguageCode,
  type VoiceTier,
} from '@soniq/i18n';
import { getAwsConfig } from '../../config.js';

let client: PollyClient | undefined;

const getClient = (): PollyClient => {
  const aws = getAwsConfig();
  // Same reasoning as `embeddings.ts`: the default chain resolves the Fargate task role in
  // production and the static `.env` keys locally.
  client ??= new PollyClient({ region: aws.POLLY_REGION });
  return client;
};

/**
 * Polly's tier names differ from ours in one place, and the mismatch is silent: passing an
 * unknown engine is a 400, but passing a *valid but wrong* one just produces a worse voice.
 */
const POLLY_ENGINE: Readonly<Record<VoiceTier, Engine>> = {
  generative: 'generative',
  'long-form': 'long-form',
  neural: 'neural',
  standard: 'standard',
};

/**
 * Raw signed 16-bit PCM at the pipeline's sample rate — the same format the microphone sends,
 * so audio never changes representation between the two ends of a turn. MP3 would be a
 * fraction of the bytes and would need decoding before playback could start, which trades
 * bandwidth we have for latency we do not.
 */
const OUTPUT_FORMAT: OutputFormat = 'pcm';

/**
 * Polly's hard input ceiling is 3000 billed characters. Chunks from `speech.ts` are capped far
 * below that, so this only ever catches a caller passing a whole answer by mistake — which is
 * worth failing loudly on rather than silently truncating someone's sentence.
 */
const MAX_SYNTHESIS_CHARS = 2800;

export interface SpeechAudio {
  /** Signed 16-bit little-endian PCM, mono, at `VOICE_SAMPLE_RATE`. */
  pcm: Buffer;
  /** How long this will take to play. The session needs it to know when it stops speaking. */
  durationMs: number;
  /** The text as spoken — kept so echo matching has something to compare against. */
  text: string;
}

/**
 * How long a PCM buffer takes to play.
 *
 * The session schedules the end of the agent's turn from this rather than from a Polly
 * response time, because what matters for echo suppression and turn-taking is when the sound
 * stops coming out of the speaker, not when the bytes arrived.
 */
export const pcmDurationMs = (pcm: Buffer): number => (pcm.length / 2 / VOICE_SAMPLE_RATE) * 1000;

/**
 * Decide which voice will speak for a whole session.
 *
 * Returns the bilingual voice covering the configured set where one exists, and the best voice
 * for the default language otherwise.
 */
export const lockVoice = (
  configured: readonly SttLanguageCode[],
  fallback: SttLanguageCode,
  options: { preferredVoiceId?: string; ceiling?: VoiceTier } = {},
): ResolvedVoice => {
  // A voice the merchant explicitly chose wins over cleverness about bilingual coverage.
  if (options.preferredVoiceId === undefined) {
    const bilingual = findBilingualVoice(configured);
    if (bilingual !== undefined) {
      const resolved = resolveVoice(bilingual.languages[0]!, {
        preferredVoiceId: bilingual.voice.id,
        ...(options.ceiling !== undefined ? { ceiling: options.ceiling } : {}),
      });
      if (resolved !== undefined) return resolved;
    }
  }

  const preferred = configured.includes(fallback) ? fallback : (configured[0] ?? fallback);
  const resolved = resolveVoice(preferred, options);
  if (resolved !== undefined) return resolved;

  // The configured default cannot be spoken at all. Rather than failing the session, find any
  // configured language we *can* speak — the caller discloses the substitution to the visitor.
  for (const code of configured) {
    const alternative = resolveVoice(code, options);
    if (alternative !== undefined) return alternative;
  }

  throw internal(
    `No Polly voice exists for any configured language (${configured.join(', ')}). ` +
      'The agent cannot speak; it must fall back to text.',
  );
};

export interface SynthesizerOptions {
  voice: ResolvedVoice;
  /** Which language the pre-warmed phrases are spoken in. */
  phraseLanguage: string;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const isRetryable = (error: unknown): boolean => {
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return status !== undefined && RETRYABLE_STATUS.has(status);
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The voice of one session.
 *
 * Holds the locked voice, the engine it settled on, and the pre-warmed clips. One per
 * conversation — it is cheap to construct and its cache is per-voice, so sharing one across
 * sessions would only mix voices back together.
 */
export class Synthesizer {
  private readonly voice: ResolvedVoice;
  private readonly phraseLanguage: string;
  /** Set when the locked engine turned out to be unavailable at runtime. */
  private engine: VoiceTier;
  private degradedAtRuntime = false;
  private readonly clips = new Map<string, SpeechAudio>();
  private phraseIndex = 0;

  constructor(options: SynthesizerOptions) {
    this.voice = options.voice;
    this.phraseLanguage = options.phraseLanguage;
    this.engine = options.voice.engine;
  }

  /** The voice this session is locked to. Disclosed to the widget in the `ready` message. */
  get lockedVoice(): ResolvedVoice {
    return {
      ...this.voice,
      engine: this.engine,
      degraded: this.voice.degraded || this.degradedAtRuntime,
    };
  }

  /**
   * Synthesise the phrases that exist to be instant, before the visitor says anything.
   *
   * Runs during the greeting, when there is nothing else competing for latency. Failures are
   * swallowed on purpose: a cold cache costs a few hundred milliseconds on the first "let me
   * check", and refusing to open the session over that would be absurd.
   */
  async prewarm(
    kinds: readonly PhraseKind[] = ['acknowledge', 'repair', 'trouble'],
  ): Promise<void> {
    const texts = new Set<string>();
    for (const kind of kinds) {
      // Every variant, not just the first — rotation is the point of having several.
      for (let i = 0; i < 4; i += 1) texts.add(getPhrase(this.phraseLanguage, kind, i));
    }

    await Promise.all(
      [...texts].map(async (text) => {
        try {
          this.clips.set(text, await this.synthesize(text));
        } catch {
          // Left uncached; it will be synthesised on demand, slower.
        }
      }),
    );
  }

  /**
   * A short fixed phrase, from memory when possible.
   *
   * `index` rotates through the variants so a visitor asking several questions does not hear
   * the same clip every time.
   */
  async phrase(kind: PhraseKind): Promise<SpeechAudio> {
    const text = getPhrase(this.phraseLanguage, kind, this.phraseIndex);
    if (kind === 'acknowledge') this.phraseIndex += 1;

    const cached = this.clips.get(text);
    if (cached !== undefined) return cached;

    const audio = await this.synthesize(text);
    this.clips.set(text, audio);
    return audio;
  }

  /** Is this phrase already in memory? Lets the session prefer an instant one when it matters. */
  hasCached(kind: PhraseKind): boolean {
    return this.clips.has(getPhrase(this.phraseLanguage, kind, this.phraseIndex));
  }

  /**
   * Which language to tell Polly this text is in.
   *
   * Only meaningful for a bilingual voice, and it is the whole reason to prefer one: Kajal
   * speaking Hindi and Kajal speaking English are the same person, so a visitor switching
   * language mid-conversation hears the same voice follow them. Passing a language a
   * monolingual voice does not speak is an error, so anything unrecognised falls back to the
   * voice's own language.
   */
  private languageFor(language: string | undefined): string {
    if (language === undefined || !this.voice.bilingual) return this.voice.languageCode;
    const ttsCode = getLanguage(language)?.ttsCode;
    return ttsCode ?? this.voice.languageCode;
  }

  /** Synthesise arbitrary text — one chunk from `speech.ts`, not a whole answer. */
  async synthesize(text: string, language?: string, attempt = 0): Promise<SpeechAudio> {
    const trimmed = text.trim();
    if (trimmed.length === 0) throw internal('Refusing to synthesise empty text.');
    if (trimmed.length > MAX_SYNTHESIS_CHARS) {
      throw internal(
        `Text is ${String(trimmed.length)} characters; Polly's limit is ${String(MAX_SYNTHESIS_CHARS)}. ` +
          'Answers must be chunked by `splitForSpeech` before reaching here.',
      );
    }

    try {
      const response = await getClient().send(
        new SynthesizeSpeechCommand({
          Text: trimmed,
          TextType: 'text',
          // The SDK's `VoiceId` union goes stale between AWS shipping a voice and the SDK
          // release that names it. The registry is the source of truth for what exists.
          VoiceId: this.voice.voiceId as VoiceId,
          Engine: POLLY_ENGINE[this.engine],
          LanguageCode: this.languageFor(language) as LanguageCode,
          OutputFormat: OUTPUT_FORMAT,
          SampleRate: String(VOICE_SAMPLE_RATE),
        }),
      );

      if (response.AudioStream === undefined) {
        throw internal('Polly returned no audio.');
      }

      const pcm = Buffer.from(await response.AudioStream.transformToByteArray());
      return { pcm, durationMs: pcmDurationMs(pcm), text: trimmed };
    } catch (error) {
      // The engine was valid for this voice on paper but not in this region, or not for this
      // language pairing. Drop a tier and keep the session alive rather than going silent.
      const downgraded = this.downgradeEngine(error);
      if (downgraded) return this.synthesize(text, language, attempt);

      if (isRetryable(error) && attempt < 3) {
        await sleep(150 * 2 ** attempt + Math.random() * 50);
        return this.synthesize(text, language, attempt + 1);
      }

      if (error instanceof InvalidSampleRateException) {
        throw internal(
          `Polly rejected ${String(VOICE_SAMPLE_RATE)} Hz PCM for ${this.voice.voiceId}. ` +
            'PCM output supports 8000 and 16000 only.',
          error,
        );
      }
      if (error instanceof Error && error.name === 'AppError') throw error;
      throw internal(`Speech synthesis failed for voice ${this.voice.voiceId}.`, error);
    }
  }

  /**
   * Step down one quality tier after a runtime rejection.
   *
   * Returns false once there is nowhere left to fall, so the caller stops retrying. The
   * degradation is recorded rather than hidden — the merchant should find out from their
   * dashboard, not from a customer saying the voice sounds robotic.
   */
  private downgradeEngine(error: unknown): boolean {
    if (!(
      error instanceof EngineNotSupportedException || error instanceof LanguageNotSupportedException
    )) {
      return false;
    }

    const next: Partial<Record<VoiceTier, VoiceTier>> = {
      generative: 'neural',
      'long-form': 'neural',
      neural: 'standard',
    };
    const fallback = next[this.engine];
    if (fallback === undefined) return false;

    console.warn(
      `[polly] ${this.voice.voiceId} rejected the ${this.engine} engine; falling back to ${fallback}.`,
    );
    this.engine = fallback;
    this.degradedAtRuntime = true;
    // Clips synthesised on the old engine would now be a different-sounding voice.
    this.clips.clear();
    return true;
  }
}

/** Test seam. The module-level client is cached, and tests must not inherit one. */
export const __resetPollyClient = (): void => {
  client = undefined;
};
