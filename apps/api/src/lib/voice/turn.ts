/**
 * Turn-taking: who is allowed to talk, and when.
 *
 * Every genuinely hard bug in a voice agent lives here. The agent answers its own echo. The
 * microphone locks up after the greeting. Someone says "mm-hmm" and the agent stops dead. A
 * cough becomes a question. The visitor interrupts and is ignored for two seconds.
 *
 * All of those are *logic* bugs, but in a normal implementation they are tangled into the
 * audio path, so the only way to reproduce one is to sit at a microphone and try. That is why
 * they take weeks to fix, and why they come back.
 *
 * So this file knows nothing about audio, sockets, AWS, or time-of-day. It takes events with
 * timestamps and returns decisions. Every rule below is a unit test that runs in under a
 * millisecond, and the whole conversation can be replayed from a log.
 *
 * The rules encoded here were paid for in production debugging on a sibling voice product
 * (see docs/phase-3-voice.md). They are re-derived as behaviour, not copied as code.
 */

/** Time is always passed in, never read. A state machine that calls `Date.now()` cannot be tested. */
export interface TurnConfig {
  /**
   * How long after the agent stops speaking its own audio may still reach the microphone.
   *
   * Only used to decide whether a transcript is *suspected* echo; a transcript in this window
   * that does not match what the agent just said is treated as a real turn. Blanket-muting the
   * window (the obvious implementation) eats fast replies, and fast replies are exactly what a
   * good conversation is made of.
   */
  echoGuardMs: number;
  /**
   * Below this, the transcript is probably wrong and the agent asks the visitor to repeat.
   *
   * Answering the wrong question confidently is the worst failure a support agent has. But
   * asking someone to repeat themselves when you did hear them is the second worst, so this
   * sits low until there is real data to tune it against. Transcribe's confidence scale is not
   * the same as other providers' — do not copy a threshold across from one.
   */
  minConfidence: number;
  /** Shorter than this (after cleaning) is noise, not speech. */
  minUtteranceChars: number;
  /**
   * True when the browser could not turn on echo cancellation. Widens the echo guard, because
   * the microphone is now genuinely hearing the speakers.
   */
  echoCancellationUnavailable?: boolean;
}

export const DEFAULT_TURN_CONFIG: TurnConfig = {
  echoGuardMs: 700,
  minConfidence: 0.5,
  minUtteranceChars: 2,
};

export type VoiceEvent =
  /** Voice activity detected. Not yet words — this is the earliest possible signal. */
  | { kind: 'speech-started'; at: number }
  | { kind: 'speech-stopped'; at: number }
  /** A running guess that will change. Never answered; used for display and barge-in triage. */
  | { kind: 'partial'; text: string; at: number; language?: string }
  | { kind: 'final'; text: string; at: number; confidence?: number; language?: string }
  /** The agent's audio began reaching the visitor's ears. */
  | { kind: 'agent-speaking-started'; turnId: string; at: number }
  /** `spoken` is what the visitor actually heard — the echo matcher needs it. */
  | { kind: 'agent-speaking-stopped'; at: number; spoken: string }
  /** The visitor pressed the stop button. Unambiguous; no classification needed. */
  | { kind: 'manual-interrupt'; at: number }
  /** A typed question on the voice connection. Always available, always wins. */
  | { kind: 'text'; text: string; at: number };

export type TurnDecision =
  /** Answer this. `text` is cleaned; `language` is what to answer and speak in. */
  | { kind: 'answer'; text: string; language?: string; interrupted?: boolean }
  /**
   * Lower the agent's volume, do not stop it.
   *
   * The first half of barge-in. Someone made a noise over the agent, and we do not yet know
   * whether it was a question or agreement. Ducking answers within ~50 ms — fast enough that
   * the visitor feels heard — and is free to undo, which stopping is not.
   */
  | { kind: 'duck'; turnId: string }
  /** It was agreement, or a cough. Return to full volume and keep talking. */
  | { kind: 'unduck'; turnId: string }
  /** It was a real interruption. Stop, discard buffered audio, and truncate history to `heard`. */
  | { kind: 'interrupt'; turnId: string; heard: string }
  /** Heard, understood, deliberately not acted on. `reason` exists to make logs readable. */
  | { kind: 'ignore'; reason: IgnoreReason }
  /** "Sorry, could you say that again?" — in the visitor's language, chosen by the caller. */
  | { kind: 'request-repeat'; language?: string };

export type IgnoreReason =
  | 'echo'
  | 'backchannel'
  | 'noise'
  | 'too-short'
  | 'empty'
  | 'duplicate'
  | 'muted'
  | 'agent-not-speaking';

/**
 * Words that mean "I'm still listening", not "stop talking".
 *
 * The list is explicit and closed, never a length heuristic. "Price?" and "Shoes?" are
 * one-word *questions*; treating every short utterance as a backchannel makes them vanish,
 * and a visitor whose short questions are ignored concludes the agent is broken.
 *
 * Covers the launch languages. Adding a language means adding its backchannels here — a
 * missing entry does not break anything, it just makes the agent slightly twitchy in that
 * language, which is the right failure direction.
 */
const BACKCHANNELS = new Set([
  // English
  'mm',
  'mmm',
  'mhm',
  'mm-hmm',
  'hm',
  'hmm',
  'uh-huh',
  'uh huh',
  'ah',
  'oh',
  'ok',
  'okay',
  'okay okay',
  'yeah',
  'yep',
  'yup',
  'yes',
  'sure',
  'right',
  'i see',
  'got it',
  'gotcha',
  'alright',
  'all right',
  'go on',
  'true',
  'exactly',
  'of course',
  // Hindi / Hinglish — the most common code-switching pair we ship
  'haan',
  'haan ji',
  'ha',
  'haa',
  'ji',
  'ji haan',
  'achha',
  'acha',
  'accha',
  'theek',
  'theek hai',
  'thik hai',
  'bilkul',
  'sahi',
  'samjha',
  'samjhi',
  'hmm haan',
  'ok ji',
  // Spanish
  'si',
  'sí',
  'ya',
  'vale',
  'claro',
  'ajá',
  'aja',
  'bueno',
  'entiendo',
  'de acuerdo',
  // Portuguese
  'sim',
  'tá',
  'ta',
  'tá bom',
  'certo',
  'entendi',
  'claro que sim',
  // French
  'oui',
  "d'accord",
  'daccord',
  'ouais',
  'je vois',
  'bien sûr',
  'bien sur',
  // German
  'ja',
  'genau',
  'okay ja',
  'verstehe',
  'stimmt',
  'aha',
  // Arabic (transliterated and script)
  'aywa',
  'naam',
  'tamam',
  'نعم',
  'أيوة',
  'تمام',
  'ماشي',
  // Japanese
  'はい',
  'ええ',
  'うん',
  'そう',
  'なるほど',
  'hai',
  'un',
  'sou',
  // Indonesian / Malay
  'iya',
  'ya',
  'oke',
  'baik',
]);

/** Pure noise: no letters at all, one character repeated, or a lone filler sound. */
const NOISE_PATTERNS: readonly RegExp[] = [
  // No letter in any script we support. Punctuation, digits alone, stray symbols.
  /^[^\p{L}]+$/u,
  // "aaaaa", "mmmm" — a stuck vowel, not a word.
  /^(.)\1{2,}$/u,
  /^(u+h+|a+h+|e+r+|u+m+|h+m+|e+h+)$/iu,
];

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();

const normalizeForMatch = (text: string): string =>
  clean(text)
    .toLowerCase()
    // Strip only trailing/leading punctuation. Internal apostrophes matter ("d'accord").
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

export const isBackchannel = (text: string): boolean => BACKCHANNELS.has(normalizeForMatch(text));

export const isNoise = (text: string): boolean => {
  const normalized = normalizeForMatch(text);
  if (normalized.length === 0) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
};

/**
 * Does this transcript look like the agent hearing itself?
 *
 * The naive echo guard mutes the microphone for a fixed window after the agent speaks, which
 * also mutes the visitor. We can do better, because we know exactly what the agent just said:
 * compare against it. A transcript that is a run of words from the agent's own last utterance
 * is echo; anything else in the same window is a fast human reply and must get through.
 *
 * Word-sequence containment rather than string containment, so that partial pickup
 * ("thirty days from the delivery date") still matches inside a longer spoken sentence, while
 * a genuine reply that happens to share a word or two does not.
 */
export const looksLikeEcho = (transcript: string, agentSpoke: string): boolean => {
  const words = normalizeForMatch(transcript).split(' ').filter(Boolean);
  if (words.length === 0) return true;

  const spoken = normalizeForMatch(agentSpoke);
  if (spoken.length === 0) return false;

  // A single word is too weak a signal either way: "yes" echoed and "yes" spoken are
  // indistinguishable. Backchannel and noise filtering handle those; echo does not guess.
  if (words.length < 2) return false;

  const spokenWords = spoken.split(' ').filter(Boolean);
  const haystack = ` ${spokenWords.join(' ')} `;
  const needle = ` ${words.join(' ')} `;
  if (haystack.includes(needle)) return true;

  // Transcription of echo is lossy — words get dropped. Fall back to overlap: if nearly every
  // word came from what the agent just said, in a stretch of speech that long, it is echo.
  const inSpoken = words.filter((word) => spokenWords.includes(word)).length;
  return words.length >= 4 && inSpoken / words.length >= 0.8;
};

interface AgentTurn {
  readonly turnId: string;
  /** Text confirmed to have reached the visitor's ears. Barge-in truncates history here. */
  spokenSoFar: string;
  ducked: boolean;
}

/**
 * The state machine.
 *
 * Deliberately a class holding mutable state rather than a reducer over an immutable value:
 * there is exactly one of these per live session, it is not shared, and the alternative buys
 * nothing but ceremony here. It stays testable because nothing inside reads a clock or does IO.
 */
export class TurnEngine {
  private readonly config: TurnConfig;

  private agentTurn: AgentTurn | null = null;
  /** What the agent last finished saying, and when. The echo matcher's reference. */
  private lastSpoken = '';
  private lastSpokenEndedAt = 0;
  private visitorSpeaking = false;
  /** Set when the visitor starts speaking over the agent; cleared once classified. */
  private pendingBargeIn = false;
  private muted = false;
  /** Language of the last accepted turn. Used when the stream stops reporting one. */
  private language: string | undefined;
  /** Guards against Transcribe re-emitting a final after a stream restart. */
  private lastAcceptedFinal = '';
  private lastAcceptedAt = 0;

  constructor(config: Partial<TurnConfig> = {}) {
    this.config = { ...DEFAULT_TURN_CONFIG, ...config };
  }

  /** Current language, so the caller can pick a repeat phrase or a voice without guessing. */
  get currentLanguage(): string | undefined {
    return this.language;
  }

  get isAgentSpeaking(): boolean {
    return this.agentTurn !== null;
  }

  /**
   * The echo window is wider when the browser has no echo cancellation, because in that case
   * the microphone really is hearing the speakers rather than a faint room reflection.
   */
  private get guardMs(): number {
    return this.config.echoCancellationUnavailable === true
      ? this.config.echoGuardMs * 2
      : this.config.echoGuardMs;
  }

  private withinEchoWindow(at: number): boolean {
    return at - this.lastSpokenEndedAt <= this.guardMs;
  }

  /**
   * Feed one event, get zero or more decisions.
   *
   * Zero or more rather than exactly one: a single interrupting utterance both stops the agent
   * and starts a new answer, and forcing that into one decision would either lose the ordering
   * or invent a compound decision type that the caller has to take apart again.
   */
  handle(event: VoiceEvent): TurnDecision[] {
    switch (event.kind) {
      case 'agent-speaking-started':
        this.agentTurn = { turnId: event.turnId, spokenSoFar: '', ducked: false };
        this.pendingBargeIn = false;
        return [];

      case 'agent-speaking-stopped':
        this.lastSpoken = event.spoken;
        this.lastSpokenEndedAt = event.at;
        this.agentTurn = null;
        this.pendingBargeIn = false;
        return [];

      case 'speech-started':
        return this.onSpeechStarted();

      case 'speech-stopped':
        this.visitorSpeaking = false;
        return [];

      case 'partial':
        return this.onPartial(event);

      case 'final':
        return this.onFinal(event);

      case 'manual-interrupt':
        // No classification: the visitor pressed a button that means stop. The only thing that
        // could make this wrong is stopping something that is not running.
        if (this.agentTurn === null) return [{ kind: 'ignore', reason: 'agent-not-speaking' }];
        return [
          { kind: 'interrupt', turnId: this.agentTurn.turnId, heard: this.agentTurn.spokenSoFar },
        ];

      case 'text': {
        // Typed input outranks everything. Someone who has started typing has stopped waiting
        // for the agent to finish talking.
        const decisions: TurnDecision[] = [];
        if (this.agentTurn !== null) {
          decisions.push({
            kind: 'interrupt',
            turnId: this.agentTurn.turnId,
            heard: this.agentTurn.spokenSoFar,
          });
        }
        const text = clean(event.text);
        if (text.length === 0) return [{ kind: 'ignore', reason: 'empty' }];
        decisions.push({
          kind: 'answer',
          text,
          ...(this.language !== undefined ? { language: this.language } : {}),
        });
        return decisions;
      }
    }
  }

  /** Record what the visitor has actually heard, so an interrupt can truncate history honestly. */
  noteSpoken(text: string): void {
    if (this.agentTurn === null) return;
    this.agentTurn.spokenSoFar =
      this.agentTurn.spokenSoFar.length === 0 ? text : `${this.agentTurn.spokenSoFar} ${text}`;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  private onSpeechStarted(): TurnDecision[] {
    this.visitorSpeaking = true;

    // Not over the agent — this is just the visitor's turn beginning. Nothing to arbitrate.
    if (this.agentTurn === null) return [];

    // Stage one of barge-in. We do not yet know whether this is a question or "mm-hmm", and
    // waiting to find out would feel unresponsive. Ducking is instant and reversible; stopping
    // is instant and not.
    this.pendingBargeIn = true;
    if (this.agentTurn.ducked) return [];
    this.agentTurn.ducked = true;
    return [{ kind: 'duck', turnId: this.agentTurn.turnId }];
  }

  private onPartial(event: Extract<VoiceEvent, { kind: 'partial' }>): TurnDecision[] {
    // Partials matter for exactly one decision: resolving a duck into a stop or a resume. They
    // are never answered — a partial is a guess, and answering guesses is how an agent ends up
    // replying to half a sentence.
    if (!this.pendingBargeIn || this.agentTurn === null) return [];

    const spoken = clean(event.text);
    if (spoken.length === 0) return [];

    // Still hearing ourselves. Stay ducked and keep waiting: undoing the duck now would make
    // the agent lurch back to full volume while the visitor is mid-word.
    if (this.withinEchoWindow(event.at) && looksLikeEcho(spoken, this.lastSpoken)) return [];
    if (looksLikeEcho(spoken, this.agentTurn.spokenSoFar)) return [];

    if (isBackchannel(spoken) || isNoise(spoken)) {
      // Agreement or a cough. Resume — but only once the visitor has stopped, otherwise the
      // volume pumps up and down while they say "yeah, yeah, yeah".
      if (this.visitorSpeaking) return [];
      this.pendingBargeIn = false;
      this.agentTurn.ducked = false;
      return [{ kind: 'unduck', turnId: this.agentTurn.turnId }];
    }

    // Real words that are not our own and not agreement. This is an interruption.
    this.pendingBargeIn = false;
    const { turnId, spokenSoFar } = this.agentTurn;
    this.agentTurn = null;
    this.lastSpoken = spokenSoFar;
    return [{ kind: 'interrupt', turnId, heard: spokenSoFar }];
  }

  private onFinal(event: Extract<VoiceEvent, { kind: 'final' }>): TurnDecision[] {
    const decisions: TurnDecision[] = [];
    const text = clean(event.text);

    if (this.muted) return [{ kind: 'ignore', reason: 'muted' }];
    if (text.length === 0) return [{ kind: 'ignore', reason: 'empty' }];

    // Echo, checked against both the turn in progress and the one that just ended. Two
    // references because the agent's audio can reach the microphone either while it is
    // speaking (weak echo cancellation) or just after it stops (room reverberation).
    const againstCurrent =
      this.agentTurn !== null && looksLikeEcho(text, this.agentTurn.spokenSoFar);
    const againstLast = this.withinEchoWindow(event.at) && looksLikeEcho(text, this.lastSpoken);
    if (againstCurrent || againstLast) {
      this.resolveDuckAfterIgnoredUtterance(decisions);
      return [...decisions, { kind: 'ignore', reason: 'echo' }];
    }

    if (isNoise(text)) {
      this.resolveDuckAfterIgnoredUtterance(decisions);
      return [...decisions, { kind: 'ignore', reason: 'noise' }];
    }

    if (isBackchannel(text)) {
      this.resolveDuckAfterIgnoredUtterance(decisions);
      return [...decisions, { kind: 'ignore', reason: 'backchannel' }];
    }

    if (normalizeForMatch(text).length < this.config.minUtteranceChars) {
      this.resolveDuckAfterIgnoredUtterance(decisions);
      return [...decisions, { kind: 'ignore', reason: 'too-short' }];
    }

    // Transcribe can replay a final after an internal stream restart. Answering it twice makes
    // the agent repeat itself for no visible reason, which reads as a hallucination.
    if (text === this.lastAcceptedFinal && event.at - this.lastAcceptedAt < 3000) {
      return [{ kind: 'ignore', reason: 'duplicate' }];
    }

    // The stream's own per-utterance language beats any guess made from the words. It is
    // acoustic, so it follows a mid-conversation switch that text heuristics cannot see.
    if (event.language !== undefined && event.language.length > 0) {
      this.language = event.language;
    }

    // A genuine utterance while the agent is speaking is an interrupt, whether or not the
    // duck stage caught it — voice activity detection can miss a quiet start.
    let interrupted = false;
    if (this.agentTurn !== null) {
      const { turnId, spokenSoFar } = this.agentTurn;
      this.agentTurn = null;
      this.pendingBargeIn = false;
      this.lastSpoken = spokenSoFar;
      this.lastSpokenEndedAt = event.at;
      decisions.push({ kind: 'interrupt', turnId, heard: spokenSoFar });
      interrupted = true;
    }

    // Confidence is checked last, so that an interrupt still lands even when the interrupting
    // words were unclear. Stopping is right regardless of whether we understood them.
    if (event.confidence !== undefined && event.confidence < this.config.minConfidence) {
      return [
        ...decisions,
        {
          kind: 'request-repeat',
          ...(this.language !== undefined ? { language: this.language } : {}),
        },
      ];
    }

    this.lastAcceptedFinal = text;
    this.lastAcceptedAt = event.at;

    decisions.push({
      kind: 'answer',
      text,
      ...(this.language !== undefined ? { language: this.language } : {}),
      ...(interrupted ? { interrupted: true } : {}),
    });
    return decisions;
  }

  /**
   * The visitor made a noise over the agent, we ducked, and the noise turned out to be nothing.
   * Return to full volume — otherwise the agent finishes its answer at half volume because
   * someone cleared their throat.
   */
  private resolveDuckAfterIgnoredUtterance(decisions: TurnDecision[]): void {
    if (this.agentTurn === null || !this.agentTurn.ducked) return;
    this.agentTurn.ducked = false;
    this.pendingBargeIn = false;
    decisions.push({ kind: 'unduck', turnId: this.agentTurn.turnId });
  }
}
