/**
 * Answer text in, speakable chunks out.
 *
 * Two jobs, both latency-critical in opposite directions.
 *
 * **Cleaning.** The model writes for a screen unless stopped, and a synthesiser reads what it
 * is given. `**Free delivery**` becomes "asterisk asterisk free delivery"; a URL becomes a
 * minute of letters. The prompt already asks for plain speech (see `packages/core/prompt.ts`)
 * — this is the guard for when it doesn't listen, which is often enough to matter.
 *
 * **Chunking.** Nothing may wait for the whole answer. The first chunk goes to synthesis the
 * instant it is complete, while the model is still writing, and that single decision is most
 * of the difference between a 1.2-second reply and a four-second one. The cost of chunking too
 * eagerly is prosody: a synthesiser given three words at a time produces three flat fragments
 * instead of a sentence. So the first chunk is allowed to be short, because that is the one
 * the visitor is waiting on, and later chunks are given room to sound like sentences.
 */

/** Clause boundaries — only ever used to get the *first* chunk out faster. */
const CLAUSE_END = /[,;:—–]\s+|\s+[-–—]\s+|(?<=[、，；：])/u;

/**
 * Abbreviations whose full stop does not end a sentence.
 *
 * Deliberately short. Every entry is a judgement call that can be wrong in some language, and
 * a missed split costs a little latency while a wrong split costs a mangled sentence.
 */
const ABBREVIATIONS =
  /(?:^|\s)(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|eg|ie|no|approx|dept|inc|ltd|co|rs|min|max|hrs?|kg|cm|mm|ml|am|pm|u\.?s|u\.?k)\.$/i;

/** A full stop that is really a decimal point or an initial: "3.5", "J. Smith". */
const MID_NUMBER_OR_INITIAL = /(?:\d\.|(?:^|\s)\p{Lu}\.)$/u;

const isRealSentenceEnd = (before: string): boolean =>
  !ABBREVIATIONS.test(before) && !MID_NUMBER_OR_INITIAL.test(before);

// --- Cleaning ------------------------------------------------------------------------------

/**
 * Remove screen formatting that a synthesiser would read aloud as punctuation.
 *
 * Order matters: links before emphasis, or the emphasis pass eats the bracket structure and
 * leaves the URL behind.
 */
export const stripMarkdown = (text: string): string =>
  text
    // Fenced and inline code — keep the contents, drop the fences.
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // [label](url) → label. The visitor cannot click a spoken link; the label is the meaning.
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Bare images.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Emphasis of every flavour.
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    // Headings, blockquotes, list markers, horizontal rules — line-leading noise.
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+[.)]\s+/gm, '')
    .replace(/^\s{0,3}([-*_])\s*(?:\1\s*){2,}$/gm, '')
    // Table pipes: the cells are content, the pipes are layout.
    .replace(/^\s*\|(.+)\|\s*$/gm, (_match, row: string) => row.split('|').join(', '))
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, '');

/**
 * Things a synthesiser reads letter by letter, or as symbols, for a long time.
 *
 * A URL read aloud is close to a minute of "h t t p s colon slash slash". Replacing it with a
 * short phrase is not information loss: the citation carrying that URL is on screen, and the
 * widget shows it.
 */
const UNSPEAKABLE: readonly (readonly [RegExp, string])[] = [
  [/\bhttps?:\/\/\S+/gi, 'the link on screen'],
  [/\bwww\.\S+/gi, 'the link on screen'],
  [/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g, 'the email address on screen'],
  // Emoji and pictographs. Polly either skips them or, worse, names them.
  [/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, ''],
  // Runs of punctuation left behind by cleaning.
  [/\s*\.{3,}/g, '…'],
];

/** Full cleaning pass. Idempotent — running it twice changes nothing. */
export const forSpeech = (text: string): string => {
  let output = stripMarkdown(text);
  for (const [pattern, replacement] of UNSPEAKABLE) output = output.replace(pattern, replacement);
  return output
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

// --- Chunking ------------------------------------------------------------------------------

export interface SentenceStreamerOptions {
  /**
   * Below this, a chunk is not worth a synthesis round trip on its own and is held back to
   * join the next one — except when flushing, where it is all that is left.
   */
  minChunkChars?: number;
  /**
   * Once the *first* chunk is still unsent at this length with no sentence end in sight, break
   * at a clause boundary instead. Only the first chunk does this: it is the one the visitor is
   * waiting on in silence, and a long opening sentence is where the wait comes from.
   */
  firstChunkClauseBreakAt?: number;
  /** A hard ceiling so a model that never punctuates cannot buffer forever. */
  maxChunkChars?: number;
}

const DEFAULTS: Required<SentenceStreamerOptions> = {
  minChunkChars: 12,
  firstChunkClauseBreakAt: 55,
  maxChunkChars: 240,
};

/**
 * Splits a token stream into speakable chunks as it arrives.
 *
 * Feed it model deltas; it returns the chunks that are ready to synthesise, which is usually
 * none. Call `flush()` when generation ends to get the tail.
 */
export class SentenceStreamer {
  private readonly options: Required<SentenceStreamerOptions>;
  private buffer = '';
  private emitted = 0;

  constructor(options: SentenceStreamerOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  /** How many chunks have gone out. Zero means the visitor is still waiting in silence. */
  get chunksEmitted(): number {
    return this.emitted;
  }

  feed(delta: string): string[] {
    this.buffer += delta;
    const chunks: string[] = [];

    for (;;) {
      const taken = this.take();
      if (taken === null) break;
      if (taken.chunk.length === 0) continue; // Consumed, but nothing sayable in it.
      chunks.push(taken.chunk);
      this.emitted += 1;
    }

    return chunks;
  }

  /** Everything still held back, cleaned. Call once, at the end of generation. */
  flush(): string | null {
    const remaining = forSpeech(this.buffer);
    this.buffer = '';
    if (remaining.length === 0) return null;
    this.emitted += 1;
    return remaining;
  }

  private take(): { chunk: string } | null {
    const cut = this.findCut();
    if (cut === null) return null;

    const chunk = forSpeech(this.buffer.slice(0, cut));
    this.buffer = this.buffer.slice(cut);
    return { chunk };
  }

  /**
   * The shortest chunk worth a synthesis round trip.
   *
   * One for the first chunk: it is the one the visitor is waiting on in silence, and any audio
   * beats none. After that, "Yes." on its own is a network round trip for four characters and
   * arrives sounding clipped, so short sentences are grown into the next one instead.
   */
  private get minChars(): number {
    return this.emitted > 0 ? this.options.minChunkChars : 1;
  }

  /** Index to cut the buffer at, or null when nothing is ready. */
  private findCut(): number | null {
    const sentenceCut = this.findSentenceCut();
    if (sentenceCut !== null) return sentenceCut;

    // The first chunk gets an escape hatch: a long opening sentence is silence the visitor is
    // sitting through, so break it at a clause instead of waiting for the full stop.
    if (this.emitted === 0 && this.buffer.length >= this.options.firstChunkClauseBreakAt) {
      const clauseCut = this.findClauseCut(this.options.firstChunkClauseBreakAt);
      if (clauseCut !== null) return clauseCut;
    }

    // A model producing an unpunctuated wall of text must not buffer forever.
    if (this.buffer.length >= this.options.maxChunkChars) {
      return (
        this.findClauseCut(this.options.maxChunkChars) ??
        this.lastSpaceBefore(this.options.maxChunkChars)
      );
    }

    return null;
  }

  /**
   * Find the end of the first complete sentence in the buffer.
   *
   * The trailing-whitespace requirement below applies to ASCII terminators only, and exists to
   * protect decimals and abbreviations ("3.5", "Rs.500"). CJK terminators (。！？) are *not*
   * followed by a space — requiring one means Japanese and Chinese answers never split at all,
   * synthesise as a single block, and triple their time to first audio. Devanagari's danda (।)
   * has the same property and the same consequence for Hindi.
   */
  private findSentenceCut(): number | null {
    // Scan for a terminator whose preceding text is a real sentence, not "3." or "Mr.".
    for (let i = 0; i < this.buffer.length; i += 1) {
      const char = this.buffer[i]!;
      if (!'.!?。！？।॥…؟'.includes(char)) continue;

      const before = this.buffer.slice(0, i + 1);
      if (!isRealSentenceEnd(before)) continue;

      let cut: number;
      if ('.!?؟'.includes(char)) {
        // ASCII terminators need whitespace after them; CJK and Devanagari ones do not.
        const rest = this.buffer.slice(i + 1);
        const match = /^\s+/.exec(rest);
        if (match === null) {
          // No whitespace yet. If more text already follows, this was not a boundary at all.
          if (rest.length > 0) continue;
          return null; // Nothing follows yet — the next delta decides.
        }
        cut = i + 1 + match[0].length;
      } else {
        cut = i + 1;
      }

      // Too short to speak on its own: keep scanning, so the fragment is grown into the next
      // sentence rather than held back forever waiting for a boundary that already passed.
      if (forSpeech(this.buffer.slice(0, cut)).length < this.minChars) continue;

      return cut;
    }

    return null;
  }

  private findClauseCut(limit: number): number | null {
    const window = this.buffer.slice(0, Math.min(limit * 2, this.buffer.length));
    let best: number | null = null;

    const pattern = new RegExp(CLAUSE_END.source, 'gu');
    for (let match = pattern.exec(window); match !== null; match = pattern.exec(window)) {
      const end = match.index + match[0].length;
      if (end < this.options.minChunkChars) continue;
      if (end > limit * 1.6) break;
      best = end;
      if (end >= limit) break;
    }

    return best;
  }

  private lastSpaceBefore(limit: number): number {
    const index = this.buffer.lastIndexOf(' ', limit);
    return index > this.options.minChunkChars ? index + 1 : limit;
  }
}

/** One-shot chunking, for text that is already complete (a greeting, a repeat request). */
export const splitForSpeech = (text: string, options?: SentenceStreamerOptions): string[] => {
  const streamer = new SentenceStreamer(options);
  const chunks = streamer.feed(text);
  const tail = streamer.flush();
  return tail === null ? chunks : [...chunks, tail];
};
