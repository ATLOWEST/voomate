/**
 * One conversation.
 *
 * Everything else in this directory is a part that does one thing and can be tested alone.
 * This is where they become a conversation, and it is the only file that knows the order
 * things happen in.
 *
 * It knows nothing about WebSockets. The transport is an interface (see ADR 0006) because the
 * hard problems here — turn-taking, barge-in, echo, latency — are identical whether the audio
 * arrives over a WebSocket today or a WebRTC session later, and tying them to a socket would
 * mean re-solving them when the transport changes.
 *
 * ## The order of one turn
 *
 * ```
 * visitor speaks ──► VAD ──────────────► duck the agent (~40 ms, reversible)
 *                 └► Transcribe ──partial──► real words? ──► cancel the turn
 *                                 │                       └─ agreement? ──► unduck
 *                                 └──final──► TurnEngine ──► answer
 *                                                             │
 *          ┌──────────────────────────────────────────────────┘
 *          ▼
 *   "let me check" (cached, ~0 ms) ─┐
 *   retrieve ──► generate ──►chunk──┴► synthesise ──► play
 * ```
 *
 * ## The two rules that shape the code
 *
 * **Nothing waits for a whole answer.** The first sentence goes to synthesis while the model
 * is still writing the second. This is most of the difference between a 1.2-second reply and a
 * four-second one, and it is why generation, chunking, synthesis and playback are four
 * concurrent stages rather than four sequential awaits.
 *
 * **Everything about the current turn must be cancellable.** A visitor who interrupts expects
 * silence immediately — not after the sentence in flight finishes synthesising. So generation
 * carries an `AbortSignal`, the synthesis queue is drained on cancel, and the client is told to
 * throw away audio it has buffered but not yet played. Missing any one of the three produces
 * the same complaint: "it doesn't stop when I talk."
 */
import {
  VOICE_FRAME_MS,
  type ServerToClientMessage,
  type ClientToServerMessage,
} from '@soniq/core';
import { getPhrase, type SttLanguageCode } from '@soniq/i18n';
import { randomUUID } from 'node:crypto';
import type { AnswerRequest, AnswerResult } from '../answer.js';
import type { SpeechAudio } from './polly.js';
import { SentenceStreamer } from './speech.js';
import { TurnEngine, type TurnConfig, type TurnDecision } from './turn.js';
import { VoiceActivityDetector } from './vad.js';

/**
 * How audio and control messages reach the visitor.
 *
 * Deliberately tiny. Anything richer would leak the transport's shape into the session, which
 * is the coupling ADR 0006 exists to avoid.
 */
export interface AudioTransport {
  send(pcm: Buffer): void;
  control(message: ServerToClientMessage): void;
  close(reason: string): void;
}

/** The synthesiser, narrowed to what a session uses. Lets tests supply a fake. */
export interface SessionSynthesizer {
  synthesize(text: string, language?: string): Promise<SpeechAudio>;
  phrase(kind: 'acknowledge' | 'repair' | 'trouble' | 'languageFallback'): Promise<SpeechAudio>;
}

/** The transcription stream, narrowed the same way. */
export interface SessionTranscription {
  start(): void;
  write(samples: Int16Array): void;
  stop(): void;
}

export interface VoiceSessionDeps {
  transport: AudioTransport;
  synthesizer: SessionSynthesizer;
  transcription: SessionTranscription;
  /** Usually `answerQuestion`; injected so the turn loop is testable without Bedrock. */
  answer: (
    request: AnswerRequest,
    onDelta?: (chunk: { delta: string }) => void,
  ) => Promise<AnswerResult>;
  /** Everything `answerQuestion` needs that does not change between turns. */
  answerContext: Omit<AnswerRequest, 'question' | 'language' | 'history' | 'signal' | 'channel'>;
  now?: () => number;
  log?: (event: Record<string, unknown>) => void;
}

export interface VoiceSessionOptions {
  conversationId: string;
  /** The agent's configured languages, in priority order. */
  languages: readonly SttLanguageCode[];
  defaultLanguage: SttLanguageCode;
  greeting?: string;
  turnConfig?: Partial<TurnConfig>;
  /**
   * How long the agent will sit silent after understanding a question before saying "let me
   * check". Below this, the acknowledgement arrives *after* the answer would have and gets in
   * its way. Above it, the visitor is listening to nothing and wondering if it heard them.
   */
  acknowledgeAfterMs?: number;
  /** Cap on stored turns. Voice conversations that run long want escalation, not more history. */
  maxHistoryTurns?: number;
}

type SessionDefaults = Required<
  Pick<VoiceSessionOptions, 'acknowledgeAfterMs' | 'maxHistoryTurns'>
>;

const DEFAULTS: SessionDefaults = {
  acknowledgeAfterMs: 400,
  maxHistoryTurns: 12,
};

/**
 * Per-stage timing for one turn. The numbers the Phase 3 plan is judged against.
 *
 * Milliseconds only, because these go straight into the protocol's `latency` map and out to
 * the widget's debug panel. A flag mixed in here would have to be carried separately anyway.
 */
export interface TurnTiming {
  /** Final transcript in hand → first audio byte on the wire. The headline number. */
  firstAudioMs?: number;
  /** Final transcript → first token from the model. */
  firstTokenMs?: number;
  /** How long the visitor waited before the agent said anything at all, filler included. */
  acknowledgeMs?: number;
  /** Whole turn, transcript to last audio byte. */
  totalMs: number;
}

interface HistoryTurn {
  role: 'visitor' | 'agent';
  content: string;
}

/** A turn in flight, and everything needed to stop it. */
interface ActiveTurn {
  id: string;
  abort: AbortController;
  /** Chunks queued for synthesis, drained in order. */
  queue: string[];
  /**
   * The in-flight drain, if any. Held as a promise rather than a boolean so a second caller
   * can await the first instead of spinning, and so `flush` can wait for the queue to empty.
   */
  draining: Promise<void> | null;
  /** Text confirmed sent as audio. Sent, not heard — see `clips`. */
  spoken: string;
  /**
   * Each clip sent, with the window of wall-clock time it occupies in the visitor's speaker.
   *
   * Sending is not hearing. Synthesis runs far ahead of playback, so at the instant someone
   * interrupts, most of `spoken` is still sitting in their playback buffer unheard. These
   * windows are what turn "we sent three sentences" into "they heard one and a half", which is
   * what history has to record.
   */
  clips: { text: string; startsAt: number; endsAt: number }[];
  /** Full generated text, whether it reached the visitor's ears or not. */
  generated: string;
  cancelled: boolean;
  startedAt: number;
  firstAudioAt?: number;
  /** When the filler phrase went out, if it did. Distinct from `firstAudioAt`, which is answer
   *  audio — the gap between them is how long the filler had to cover. */
  acknowledgedAt?: number;
  /**
   * This turn's answer entry in `history`, once written.
   *
   * An interrupt during playback arrives after the entry exists, and has to correct it down to
   * what was actually heard rather than append a second, contradictory one. Held as a reference
   * rather than an index because history trims from the front, which moves every index.
   */
  historyEntry?: HistoryTurn;
  language: string;
}

export class VoiceSession {
  private readonly deps: Required<Pick<VoiceSessionDeps, 'now' | 'log'>> & VoiceSessionDeps;
  private readonly options: VoiceSessionOptions & SessionDefaults;
  private readonly turns: TurnEngine;
  private readonly vad: VoiceActivityDetector;
  private readonly history: HistoryTurn[] = [];

  /** The turn being generated. Cleared the moment the last chunk is handed to the transport. */
  private active: ActiveTurn | null = null;
  /**
   * The turn the visitor can still hear.
   *
   * Not the same lifetime as `active`, and conflating them is a serious bug. Synthesis outruns
   * playback by a long way — a twenty-second answer is generated and sent in about a second,
   * and for the other nineteen the visitor is listening to audio the server has already
   * finished producing. If interrupting only worked against `active`, pressing stop or talking
   * over the agent would do nothing for most of every answer.
   *
   * This is cleared by `stopSpeaking`, which the playback cursor drives.
   */
  private audible: ActiveTurn | null = null;
  /**
   * When the audio already sent will finish playing, in server wall-clock time.
   *
   * The server never learns when the browser actually finishes a buffer, so it models it:
   * audio queues up and plays back to back, so each clip ends at `max(now, cursor) + duration`.
   * This is what tells the turn engine the agent stopped speaking, which is what opens the
   * echo window. Getting it wrong in either direction is audible — too early and the agent's
   * own voice is answered as a question, too late and a fast human reply is swallowed.
   */
  private playbackEndsAt = 0;
  private speakingTimer: NodeJS.Timeout | undefined;
  private acknowledgeTimer: NodeJS.Timeout | undefined;
  private closed = false;
  private started = false;

  constructor(options: VoiceSessionOptions, deps: VoiceSessionDeps) {
    this.options = { ...DEFAULTS, ...options };
    this.deps = { now: () => Date.now(), log: () => undefined, ...deps };
    this.turns = new TurnEngine(options.turnConfig ?? {});
    this.vad = new VoiceActivityDetector();
  }

  /** The transcript so far. Exposed for persistence and for tests. */
  get transcript(): readonly HistoryTurn[] {
    return this.history;
  }

  /** True while sound is still leaving the visitor's speaker, not merely while generating. */
  get isSpeaking(): boolean {
    return this.audible !== null;
  }

  // --- Lifecycle ---------------------------------------------------------------------------

  /** Open the session: start listening, then greet. */
  async start(voice: {
    voiceId: string;
    languageCode: string;
    engine: string;
    degraded: boolean;
  }): Promise<void> {
    if (this.started) return;
    this.started = true;

    // Listening starts before greeting, not after. A visitor who talks over the greeting is
    // common — they have used one of these before and want to skip the pleasantries — and
    // starting the transcription stream afterwards loses exactly those words.
    this.deps.transcription.start();

    this.deps.transport.control({
      type: 'ready',
      protocolVersion: 1,
      conversationId: this.options.conversationId,
      voice,
      ...(this.options.greeting !== undefined ? { greeting: this.options.greeting } : {}),
    });

    if (this.options.greeting !== undefined && this.options.greeting.trim().length > 0) {
      await this.speakStandalone(this.options.greeting, this.options.defaultLanguage);
    }
  }

  /**
   * Audio from the visitor.
   *
   * Two consumers with different urgencies: the detector, which decides in ~40 ms whether to
   * duck the agent, and the transcription stream, which takes a few hundred milliseconds to
   * decide what was actually said. Both see every frame.
   */
  pushAudio(samples: Int16Array): void {
    if (this.closed) return;

    const event = this.vad.push(samples, VOICE_FRAME_MS);
    if (event === 'speech-started') {
      this.deps.transport.control({ type: 'speech-started' });
      this.apply(this.turns.handle({ kind: 'speech-started', at: this.deps.now() }));
    } else if (event === 'speech-stopped') {
      this.deps.transport.control({ type: 'speech-stopped' });
      this.apply(this.turns.handle({ kind: 'speech-stopped', at: this.deps.now() }));
    }

    this.deps.transcription.write(samples);
  }

  /** A transcript from the recogniser. */
  pushTranscript(result: {
    text: string;
    final: boolean;
    confidence?: number;
    language?: string;
    at: number;
  }): void {
    if (this.closed) return;

    this.deps.transport.control({
      type: 'transcript',
      text: result.text,
      final: result.final,
      ...(result.language !== undefined ? { language: result.language } : {}),
      ...(result.confidence !== undefined ? { confidence: result.confidence } : {}),
    });

    this.apply(
      this.turns.handle(
        result.final
          ? {
              kind: 'final',
              text: result.text,
              at: result.at,
              ...(result.confidence !== undefined ? { confidence: result.confidence } : {}),
              ...(result.language !== undefined ? { language: result.language } : {}),
            }
          : {
              kind: 'partial',
              text: result.text,
              at: result.at,
              ...(result.language !== undefined ? { language: result.language } : {}),
            },
      ),
    );
  }

  /** A control message from the widget. */
  handleMessage(message: ClientToServerMessage): void {
    if (this.closed) return;

    switch (message.type) {
      case 'interrupt':
        this.apply(this.turns.handle({ kind: 'manual-interrupt', at: this.deps.now() }));
        break;

      case 'mute':
        this.turns.setMuted(message.muted);
        break;

      case 'text':
        this.apply(this.turns.handle({ kind: 'text', text: message.content, at: this.deps.now() }));
        break;

      case 'end':
        void this.close('client-ended');
        break;

      case 'start':
        // Handled by the transport before a session exists; a second one is a client bug.
        break;
    }
  }

  async close(reason: string): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    const outgoing = this.active ?? this.audible;
    if (outgoing !== null) this.interrupt(outgoing.id, outgoing.spoken);
    if (this.speakingTimer !== undefined) clearTimeout(this.speakingTimer);
    if (this.acknowledgeTimer !== undefined) clearTimeout(this.acknowledgeTimer);

    this.deps.transcription.stop();
    this.deps.transport.control({ type: 'ended', reason });
    this.deps.transport.close(reason);
  }

  // --- Decisions ---------------------------------------------------------------------------

  private apply(decisions: readonly TurnDecision[]): void {
    for (const decision of decisions) {
      switch (decision.kind) {
        case 'duck':
          this.deps.transport.control({ type: 'duck', turnId: decision.turnId });
          break;

        case 'unduck':
          this.deps.transport.control({ type: 'unduck', turnId: decision.turnId });
          break;

        case 'interrupt':
          this.interrupt(decision.turnId, decision.heard);
          break;

        case 'answer':
          void this.runTurn(decision.text, decision.language);
          break;

        case 'request-repeat':
          void this.requestRepeat(decision.language);
          break;

        case 'ignore':
          this.deps.log({ event: 'voice.ignored', reason: decision.reason });
          break;
      }
    }
  }

  /**
   * Stop the agent mid-answer.
   *
   * All three parts matter. Aborting generation stops Bedrock billing for tokens nobody will
   * hear. Draining the queue stops a sentence already in synthesis from arriving after the
   * silence. Telling the client to discard is the only one that affects what the visitor
   * actually hears in the next second, because their playback buffer is already ahead of us.
   */
  private interrupt(turnId: string, heard: string): void {
    // Either lifetime can be the target: a turn still generating, or one that finished
    // generating and is still playing out of the visitor's speaker.
    const turn =
      this.active?.id === turnId ? this.active : this.audible?.id === turnId ? this.audible : null;
    if (turn === null) return;

    turn.cancelled = true;
    turn.abort.abort();
    turn.queue.length = 0;

    this.deps.transport.control({ type: 'cancel', turnId });
    this.stopSpeaking(heard.length > 0 ? heard : turn.spoken);

    // History records what the visitor *heard*, not what was generated or even what was sent.
    // An agent that later refers back to a sentence it was cut off before saying is a specific,
    // confusing bug. A turn interrupted during playback has already written its full answer to
    // history, so this truncates that entry rather than appending a second one.
    this.rememberSpoken(turn, this.heardSoFar(turn, this.deps.now()));

    this.deps.log({
      event: 'voice.interrupted',
      turnId,
      spokenChars: heard.length,
      generatedChars: turn.generated.length,
    });

    if (this.active === turn) this.active = null;
    this.audible = null;
  }

  /** Record, or correct, what the visitor heard of this turn. */
  private rememberSpoken(turn: ActiveTurn, heard: string): void {
    const trimmed = heard.trim();

    if (turn.historyEntry === undefined) {
      if (trimmed.length === 0) return;
      turn.historyEntry = this.remember('agent', trimmed);
      return;
    }

    if (trimmed.length === 0) {
      // Cut off before a single word landed. There is nothing honest to keep.
      const at = this.history.indexOf(turn.historyEntry);
      if (at !== -1) this.history.splice(at, 1);
      turn.historyEntry = undefined;
      return;
    }

    turn.historyEntry.content = trimmed;
  }

  // --- Speaking ----------------------------------------------------------------------------

  /**
   * Say something that is not an answer — a greeting, a repair, an error.
   *
   * Still a turn as far as the engine is concerned, because the visitor can interrupt a
   * greeting exactly as readily as an answer, and the echo guard has to know it was said.
   */
  private async speakStandalone(text: string, language: string): Promise<void> {
    const turnId = randomUUID();
    const turn: ActiveTurn = {
      id: turnId,
      abort: new AbortController(),
      queue: [],
      draining: null,
      spoken: '',
      clips: [],
      generated: text,
      cancelled: false,
      startedAt: this.deps.now(),
      language,
    };
    this.active = turn;
    this.audible = turn;
    this.beginSpeaking(turnId);

    try {
      await this.speak(turn, text);
    } catch (error) {
      this.deps.log({ event: 'voice.speak_failed', error: String(error) });
    }

    if (this.active === turn) {
      this.finishTurn(turn, { totalMs: this.deps.now() - turn.startedAt });
    }
  }

  /** Synthesise one chunk and put it on the wire. */
  private async speak(turn: ActiveTurn, text: string): Promise<void> {
    const audio = await this.deps.synthesizer.synthesize(text, turn.language);
    if (turn.cancelled || this.closed) return;

    turn.firstAudioAt ??= this.deps.now();
    turn.spoken = turn.spoken.length === 0 ? audio.text : `${turn.spoken} ${audio.text}`;
    this.turns.noteSpoken(audio.text);
    this.deps.transport.send(audio.pcm);
    this.noteClip(turn, audio.text, audio.durationMs);
    this.extendPlayback(audio.durationMs);
  }

  /** Record when this clip will actually be audible. Must run before `extendPlayback` moves it. */
  private noteClip(turn: ActiveTurn, text: string, durationMs: number): void {
    const startsAt = Math.max(this.deps.now(), this.playbackEndsAt);
    turn.clips.push({ text, startsAt, endsAt: startsAt + durationMs });
  }

  /**
   * What the visitor has actually heard of this turn by `at`.
   *
   * Whole clips that finished, plus a word-proportional prefix of the one playing. The prefix
   * is an estimate — speech is not evenly spaced across words — but it is wrong by a word or
   * two, where crediting the whole buffer is wrong by entire sentences.
   */
  private heardSoFar(turn: ActiveTurn, at: number): string {
    const parts: string[] = [];

    for (const clip of turn.clips) {
      if (at >= clip.endsAt) {
        parts.push(clip.text);
        continue;
      }
      if (at <= clip.startsAt) break;

      const words = clip.text.split(/\s+/).filter((word) => word.length > 0);
      const fraction = (at - clip.startsAt) / (clip.endsAt - clip.startsAt);
      const kept = Math.floor(words.length * fraction);
      if (kept > 0) parts.push(words.slice(0, kept).join(' '));
      break;
    }

    return parts.join(' ');
  }

  private beginSpeaking(turnId: string): void {
    this.turns.handle({ kind: 'agent-speaking-started', turnId, at: this.deps.now() });
    this.deps.transport.control({ type: 'turn-start', turnId });
  }

  /**
   * Advance the model of when the browser will finish playing.
   *
   * `max(now, cursor)` rather than `cursor + duration`: if the queue has already drained the
   * next clip starts now, and carrying a stale cursor forward would leave the session thinking
   * the agent is still talking through a silence — which keeps the echo guard open and eats
   * the visitor's next sentence.
   */
  private extendPlayback(durationMs: number): void {
    const now = this.deps.now();
    this.playbackEndsAt = Math.max(now, this.playbackEndsAt) + durationMs;

    if (this.speakingTimer !== undefined) clearTimeout(this.speakingTimer);
    this.speakingTimer = setTimeout(
      () => {
        if (this.audible !== null) this.stopSpeaking(this.audible.spoken);
      },
      Math.max(0, this.playbackEndsAt - now),
    );
    this.speakingTimer.unref();
  }

  private stopSpeaking(spoken: string): void {
    if (this.speakingTimer !== undefined) {
      clearTimeout(this.speakingTimer);
      this.speakingTimer = undefined;
    }
    // The echo window opens from *here* — when sound stops leaving the speaker, not when the
    // last byte was sent. `playbackEndsAt` is in the future while audio is still queued.
    this.playbackEndsAt = 0;
    this.audible = null;
    this.turns.handle({ kind: 'agent-speaking-stopped', at: this.deps.now(), spoken });
  }

  // --- The answer turn ---------------------------------------------------------------------

  private async runTurn(question: string, language?: string): Promise<void> {
    // A new question always supersedes the one being answered. The engine has usually already
    // emitted the interrupt, but a typed question while the agent is mid-sentence can land
    // here first.
    const outgoing = this.active ?? this.audible;
    if (outgoing !== null) this.interrupt(outgoing.id, outgoing.spoken);

    const turnId = randomUUID();
    const turn: ActiveTurn = {
      id: turnId,
      abort: new AbortController(),
      queue: [],
      draining: null,
      spoken: '',
      clips: [],
      generated: '',
      cancelled: false,
      startedAt: this.deps.now(),
      language: language ?? this.turns.currentLanguage ?? this.options.defaultLanguage,
    };
    this.active = turn;
    this.audible = turn;
    this.remember('visitor', question);
    this.beginSpeaking(turnId);
    this.scheduleAcknowledgement(turn);

    const streamer = new SentenceStreamer();
    let firstTokenAt: number | undefined;

    try {
      const result = await this.deps.answer(
        {
          ...this.deps.answerContext,
          question,
          language: turn.language,
          channel: 'voice',
          history: this.history.slice(0, -1).slice(-this.options.maxHistoryTurns),
          signal: turn.abort.signal,
        },
        ({ delta }) => {
          firstTokenAt ??= this.deps.now();
          if (turn.cancelled) return;

          turn.generated += delta;
          this.deps.transport.control({ type: 'answer-delta', turnId, text: delta });
          for (const chunk of streamer.feed(delta)) this.enqueue(turn, chunk);
        },
      );

      if (turn.cancelled || this.closed) return;

      const tail = streamer.flush();
      if (tail !== null) this.enqueue(turn, tail);
      await this.drain(turn);

      if (turn.cancelled || this.closed) return;

      turn.historyEntry = this.remember('agent', result.text);
      this.finishTurn(
        turn,
        {
          ...(turn.firstAudioAt !== undefined
            ? { firstAudioMs: turn.firstAudioAt - turn.startedAt }
            : {}),
          ...(firstTokenAt !== undefined ? { firstTokenMs: firstTokenAt - turn.startedAt } : {}),
          ...(turn.acknowledgedAt !== undefined
            ? { acknowledgeMs: turn.acknowledgedAt - turn.startedAt }
            : {}),
          totalMs: this.deps.now() - turn.startedAt,
        },
        result,
      );
    } catch (error) {
      if (turn.cancelled) return; // Interrupting aborts generation; that is not a failure.
      await this.reportTrouble(turn, error);
    }
  }

  /**
   * Fill the silence between understanding a question and answering it.
   *
   * Only if the wait actually happens. Firing this unconditionally means an agent that says
   * "let me check" before every answer including the fast ones, which is worse than the silence
   * it was covering — and the cached clip is what makes it cost nothing when it does fire.
   */
  private scheduleAcknowledgement(turn: ActiveTurn): void {
    if (this.acknowledgeTimer !== undefined) clearTimeout(this.acknowledgeTimer);

    this.acknowledgeTimer = setTimeout(() => {
      if (turn.cancelled || this.closed || this.active !== turn) return;
      if (turn.firstAudioAt !== undefined || turn.queue.length > 0) return;

      void this.deps.synthesizer
        .phrase('acknowledge')
        .then((audio) => {
          // Re-check: generation may have produced its first chunk while this was synthesising.
          if (turn.cancelled || this.closed || turn.firstAudioAt !== undefined) return;
          turn.acknowledgedAt = this.deps.now();
          turn.spoken = audio.text;
          this.turns.noteSpoken(audio.text);
          this.deps.transport.send(audio.pcm);
          this.noteClip(turn, audio.text, audio.durationMs);
          this.extendPlayback(audio.durationMs);
        })
        .catch(() => undefined);
    }, this.options.acknowledgeAfterMs);
    this.acknowledgeTimer.unref();
  }

  /**
   * Queue a chunk for synthesis.
   *
   * Serial, not parallel. Two chunks synthesised concurrently can finish out of order, and
   * sentence two arriving before sentence one is not a subtle degradation — it is nonsense.
   */
  private enqueue(turn: ActiveTurn, chunk: string): void {
    turn.queue.push(chunk);
    if (turn.draining === null) void this.drain(turn);
  }

  private async drain(turn: ActiveTurn): Promise<void> {
    // A drain is already running; it will pick up anything enqueued since. Awaiting it is
    // enough, and starting a second one would interleave chunks into nonsense.
    if (turn.draining !== null) return turn.draining;

    const run = async (): Promise<void> => {
      while (turn.queue.length > 0 && !turn.cancelled && !this.closed) {
        const chunk = turn.queue.shift()!;
        try {
          await this.speak(turn, chunk);
        } catch (error) {
          // One chunk failing to synthesise should not silence the rest of the answer — the
          // visitor gets a gap in a sentence rather than an abandoned turn.
          this.deps.log({ event: 'voice.chunk_failed', turnId: turn.id, error: String(error) });
        }
      }
    };

    const promise = run().finally(() => {
      turn.draining = null;
    });
    turn.draining = promise;
    return promise;
  }

  private finishTurn(turn: ActiveTurn, timing: TurnTiming, result?: AnswerResult): void {
    this.deps.transport.control({
      type: 'turn-end',
      turnId: turn.id,
      text: result?.text ?? turn.generated,
      ...(result?.citations !== undefined && result.citations.length > 0
        ? {
            citations: result.citations.map((c) => ({
              title: c.title,
              ...(c.url !== undefined ? { url: c.url } : {}),
            })),
          }
        : {}),
      ...(result?.ungrounded === true ? { ungrounded: true } : {}),
      latency: { ...timing, ...(result?.latency ?? {}) },
    });

    this.deps.log({ event: 'voice.turn', turnId: turn.id, ...timing });
    if (this.active === turn) this.active = null;
  }

  /** Low confidence. Ask again, in their language, from the cache so it lands immediately. */
  private async requestRepeat(language?: string): Promise<void> {
    const lang = language ?? this.turns.currentLanguage ?? this.options.defaultLanguage;
    const text = getPhrase(lang, 'repair');
    this.deps.transport.control({ type: 'repeat-request', text });

    try {
      const audio = await this.deps.synthesizer.phrase('repair');
      if (this.closed) return;
      this.turns.noteSpoken(audio.text);
      this.deps.transport.send(audio.pcm);
      this.extendPlayback(audio.durationMs);
    } catch (error) {
      this.deps.log({ event: 'voice.repair_failed', error: String(error) });
    }
  }

  /**
   * Something broke mid-answer.
   *
   * The visitor hears a short apology rather than silence. Silence is indistinguishable from
   * the agent having crashed, and a visitor who thinks that leaves.
   */
  private async reportTrouble(turn: ActiveTurn, error: unknown): Promise<void> {
    this.deps.log({ event: 'voice.turn_failed', turnId: turn.id, error: String(error) });
    this.deps.transport.control({
      type: 'error',
      code: 'turn_failed',
      message: 'The agent could not complete that answer.',
      fatal: false,
    });

    try {
      const audio = await this.deps.synthesizer.phrase('trouble');
      if (!this.closed && !turn.cancelled) {
        this.deps.transport.send(audio.pcm);
        this.extendPlayback(audio.durationMs);
      }
    } catch {
      // Nothing further to try; the control message already told the widget.
    }

    if (this.active === turn) {
      this.stopSpeaking(turn.spoken);
      this.active = null;
    }
  }

  /** Returns the stored entry so a turn can correct its own line later. */
  private remember(role: 'visitor' | 'agent', content: string): HistoryTurn | undefined {
    const trimmed = content.trim();
    if (trimmed.length === 0) return undefined;

    const entry: HistoryTurn = { role, content: trimmed };
    this.history.push(entry);
    // Trim generously — `answerQuestion` applies its own tighter window, and keeping a little
    // more here costs nothing and leaves a fuller transcript to persist.
    while (this.history.length > this.options.maxHistoryTurns * 2) this.history.shift();
    return entry;
  }
}
