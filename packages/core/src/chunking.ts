/**
 * Chunking.
 *
 * Retrieval quality is decided here, before a single embedding is computed. A chunk is the
 * unit the model actually reads, so the whole job is: make each chunk a self-contained answer
 * to *something*, and never split one answer across two chunks.
 *
 * Deliberately dependency-free and synchronous. It is the most-tested code in the ingestion
 * path, and tests that need no network or database get run.
 *
 * ## The rules, in priority order
 *
 * 1. **Never split mid-sentence.** A chunk ending "our return window is" is worse than
 *    useless — it retrieves on "return window" and then tells the visitor nothing.
 * 2. **Prefer paragraph boundaries.** Merchants write one idea per paragraph. Respecting that
 *    costs nothing and is usually exactly right.
 * 3. **Overlap adjacent chunks.** The sentence that introduces a policy and the sentence that
 *    states it often straddle a boundary; overlap means whichever one the query matches, the
 *    other comes along.
 * 4. **Carry the heading down.** "Free over ₹999" means nothing without "Shipping" above it.
 *    A chunk that has lost its heading is a chunk that will be retrieved for the wrong query.
 */

/** Approximate. See {@link estimateTokens}. */
export interface ChunkOptions {
  /** Upper bound per chunk, in estimated tokens. */
  maxTokens?: number;
  /**
   * Below this, a trailing fragment is merged back into the previous chunk instead of
   * standing alone. A 12-token chunk embeds to a vector that matches almost anything.
   */
  minTokens?: number;
  /** Estimated tokens repeated from the end of the previous chunk. */
  overlapTokens?: number;
  /**
   * Markdown heading trail, e.g. `['Shipping', 'International']`, prefixed to every chunk.
   * Callers that extracted structure should pass it; the splitter also picks up headings it
   * finds inline.
   */
  headingTrail?: readonly string[];
}

export interface Chunk {
  /** Position within the document. Stable across a re-chunk of identical input. */
  ordinal: number;
  /** The text to embed and to show. Includes the heading prefix, if any. */
  content: string;
  estimatedTokens: number;
  /** Headings in force at this point, outermost first. */
  headings: readonly string[];
}

const DEFAULTS = {
  // ~2-3 paragraphs. Large enough to hold a complete policy statement, small enough that the
  // embedding still describes one topic rather than averaging four.
  maxTokens: 512,
  minTokens: 64,
  overlapTokens: 64,
} as const;

/**
 * Token estimate without a tokeniser.
 *
 * Pulling in a real BPE tokeniser costs a multi-megabyte dependency and startup time, to
 * refine a number we only use to decide where to cut. English averages ~4 characters per
 * token; Devanagari and other non-Latin scripts run closer to ~2, so we take the pessimistic
 * branch when the text is substantially non-ASCII. Being wrong here means slightly small
 * chunks, which is the harmless direction — the model's context is not the binding constraint.
 */
export const estimateTokens = (text: string): number => {
  if (text.length === 0) return 0;
  let nonAscii = 0;
  for (const char of text) if (char.codePointAt(0)! > 127) nonAscii += 1;
  const charsPerToken = nonAscii / [...text].length > 0.2 ? 2 : 4;
  return Math.max(1, Math.ceil(text.length / charsPerToken));
};

/** ATX headings only. Setext (`===` underlines) does not survive readability extraction. */
const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;

/**
 * Sentence boundaries.
 *
 * Terminator, optional closing quote/bracket, then whitespace. The lookbehind rejects the
 * common abbreviations that would otherwise cut a sentence in half — an English-centric list,
 * but the failure mode when it misses is one slightly short chunk, not a broken one.
 */
const SENTENCE_END =
  /(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|approx|No|Rs|Inc|Ltd|Co))[.!?۔।]["'”’)\]]*\s+/gu;

/**
 * Split text into sentences, keeping terminators attached.
 *
 * Exported because the RAG layer re-uses it to trim a retrieved chunk down to the part it
 * quotes, and the two must agree on where a sentence ends.
 */
export const splitSentences = (text: string): string[] => {
  const out: string[] = [];
  let start = 0;
  SENTENCE_END.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_END.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const sentence = text.slice(start, end).trim();
    if (sentence.length > 0) out.push(sentence);
    start = end;
  }
  const tail = text.slice(start).trim();
  if (tail.length > 0) out.push(tail);
  // A wall of text with no terminator at all — common in scraped bullet lists — must still
  // produce something, or the page silently contributes nothing to the corpus.
  return out.length > 0 ? out : [text.trim()].filter((s) => s.length > 0);
};

/** Blank-line separated blocks, with headings isolated so they attach to what follows. */
interface Block {
  text: string;
  heading?: { depth: number; title: string };
}

const toBlocks = (text: string): Block[] => {
  const blocks: Block[] = [];
  for (const raw of text.split(/\n{2,}/)) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;

    // A block may open with a heading and continue with its prose. Split so the heading can
    // become context rather than content.
    const lines = trimmed.split('\n');
    let pending: string[] = [];
    const flush = () => {
      if (pending.length > 0) {
        blocks.push({ text: pending.join('\n').trim() });
        pending = [];
      }
    };
    for (const line of lines) {
      const match = HEADING.exec(line.trim());
      if (match !== null) {
        flush();
        blocks.push({ text: '', heading: { depth: match[1]!.length, title: match[2]!.trim() } });
      } else {
        pending.push(line);
      }
    }
    flush();
  }
  return blocks;
};

/** Maintains the heading stack: an `##` closes every deeper heading before it. */
const applyHeading = (trail: string[], depth: number, title: string): string[] => {
  const next = trail.slice(0, Math.max(0, depth - 1));
  while (next.length < depth - 1) next.push('');
  next.push(title);
  return next.filter((t) => t.length > 0);
};

const prefixOf = (headings: readonly string[]): string =>
  headings.length > 0 ? `${headings.join(' › ')}\n\n` : '';

/**
 * Take whole sentences from the end of `text` totalling at most `budget` tokens.
 *
 * Overlap on a sentence boundary rather than a character one: a half-sentence prepended to
 * the next chunk adds noise to its embedding and reads as damage in a citation.
 */
const tailSentences = (text: string, budget: number): string => {
  if (budget <= 0) return '';
  const sentences = splitSentences(text);
  const kept: string[] = [];
  let total = 0;
  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    const cost = estimateTokens(sentences[i]!);
    if (total + cost > budget && kept.length > 0) break;
    kept.unshift(sentences[i]!);
    total += cost;
    if (total >= budget) break;
  }
  return kept.join(' ');
};

/**
 * Split a document into embeddable chunks.
 *
 * Input is UNTRUSTED merchant-site text. This function does not sanitise it — see
 * `flagInjection` in `./sanitize.js`, which runs before this and decides whether the document
 * should be indexed at all. Chunking assumes that decision has already been made.
 */
export const chunkDocument = (text: string, options: ChunkOptions = {}): Chunk[] => {
  const maxTokens = options.maxTokens ?? DEFAULTS.maxTokens;
  const minTokens = options.minTokens ?? DEFAULTS.minTokens;
  const overlapTokens = Math.min(options.overlapTokens ?? DEFAULTS.overlapTokens, maxTokens >> 1);

  const normalised = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  if (normalised.length === 0) return [];

  const chunks: Chunk[] = [];
  let headings: string[] = [...(options.headingTrail ?? [])];
  let buffer = '';
  let bufferHeadings = [...headings];

  const emit = (): void => {
    const body = buffer.trim();
    if (body.length === 0) return;
    const content = prefixOf(bufferHeadings) + body;
    chunks.push({
      ordinal: chunks.length,
      content,
      estimatedTokens: estimateTokens(content),
      headings: [...bufferHeadings],
    });
    buffer = '';
  };

  /** Room left in the current buffer, accounting for the heading prefix it will carry. */
  const remaining = (): number =>
    maxTokens - estimateTokens(buffer) - estimateTokens(prefixOf(bufferHeadings));

  const startNextBuffer = (previous: string): void => {
    bufferHeadings = [...headings];
    buffer = tailSentences(previous, overlapTokens);
    if (buffer.length > 0) buffer += ' ';
  };

  for (const block of toBlocks(normalised)) {
    if (block.heading !== undefined) {
      // A heading opens a new topic. Closing the chunk here is the single highest-value
      // boundary available, so take it even if the buffer is only half full.
      const previous = buffer;
      emit();
      headings = applyHeading(headings, block.heading.depth, block.heading.title);
      // No overlap across a heading: the previous section's tail would drag the new section's
      // embedding towards the old topic, which is precisely what the heading told us not to do.
      void previous;
      buffer = '';
      bufferHeadings = [...headings];
      continue;
    }

    for (const sentence of splitSentences(block.text)) {
      const cost = estimateTokens(sentence);

      // A single sentence over budget cannot be placed by sentence-level packing. Hard-wrap
      // it on whitespace: rare (legal boilerplate, un-punctuated scrapes) but it must not
      // wedge the loop.
      if (cost > maxTokens) {
        const previous = buffer;
        emit();
        if (previous.length > 0) startNextBuffer(previous);
        for (const word of sentence.split(/\s+/)) {
          if (remaining() < estimateTokens(word) + 1 && buffer.trim().length > 0) emit();
          buffer += `${word} `;
        }
        buffer += '\n\n';
        continue;
      }

      if (cost > remaining() && buffer.trim().length > 0) {
        const previous = buffer;
        emit();
        startNextBuffer(previous);
      }
      buffer += `${sentence} `;
    }
    buffer += '\n\n';
  }
  emit();

  // A trailing fragment stands alone only if it can carry meaning. Below the floor it goes
  // back onto its predecessor, where its sentences at least have neighbours.
  //
  // Not across a heading, though. Rule 2 says a heading is the strongest boundary we have,
  // and a short final section is a legitimately short section — merging "Contact us" into
  // the returns policy above it produces a chunk that answers neither question well.
  const last = chunks[chunks.length - 1];
  const prior = chunks[chunks.length - 2];
  const sameSection =
    prior !== undefined &&
    last !== undefined &&
    prior.headings.length === last.headings.length &&
    prior.headings.every((h, i) => h === last.headings[i]);

  if (sameSection && last.estimatedTokens < minTokens) {
    const previous = prior;
    const merged = `${previous.content}\n\n${last.content.slice(prefixOf(last.headings).length)}`;
    chunks.splice(chunks.length - 2, 2, {
      ordinal: previous.ordinal,
      content: merged,
      estimatedTokens: estimateTokens(merged),
      headings: previous.headings,
    });
  }

  return chunks;
};
