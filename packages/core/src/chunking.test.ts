import { describe, expect, it } from 'vitest';
import { chunkDocument, estimateTokens, splitSentences } from './chunking.js';

/**
 * These tests encode the chunking rules as *properties*, not as expected strings. Exact
 * boundaries will move as the splitter is tuned; "no chunk ends mid-sentence" must not.
 */

const paragraph = (sentences: number, word = 'policy'): string =>
  Array.from({ length: sentences }, (_, i) => `This is sentence ${i} about our ${word}.`).join(' ');

describe('estimateTokens', () => {
  it('is zero only for empty input', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('a')).toBeGreaterThan(0);
  });

  it('charges non-Latin scripts more per character', () => {
    // Same character count, different scripts. Devanagari really does cost ~2x the tokens,
    // and under-counting it is how a "512 token" chunk silently becomes 900.
    const latin = 'aaaaaaaaaaaaaaaaaaaa';
    const devanagari = 'नमस्कारनमस्कारनमस्कार'.slice(0, 20);
    expect(estimateTokens(devanagari)).toBeGreaterThan(estimateTokens(latin));
  });
});

describe('splitSentences', () => {
  it('keeps terminators attached', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });

  it('does not split on common abbreviations', () => {
    expect(splitSentences('Contact Dr. Rao for details.')).toHaveLength(1);
    expect(splitSentences('Shipping costs Rs. 200 per order.')).toHaveLength(1);
  });

  it('handles Devanagari and Urdu full stops', () => {
    expect(splitSentences('यह पहला वाक्य है। यह दूसरा है।')).toHaveLength(2);
  });

  it('returns the whole text when there is no terminator at all', () => {
    // Scraped bullet lists routinely look like this. Returning [] here would silently drop
    // the page from the corpus.
    expect(splitSentences('free shipping over 999')).toEqual(['free shipping over 999']);
  });
});

describe('chunkDocument', () => {
  it('returns nothing for empty or whitespace-only input', () => {
    expect(chunkDocument('')).toEqual([]);
    expect(chunkDocument('   \n\n  \t ')).toEqual([]);
  });

  it('keeps a short document as a single chunk', () => {
    const chunks = chunkDocument('We ship within 2 business days.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.ordinal).toBe(0);
  });

  it('never ends a chunk mid-sentence', () => {
    const chunks = chunkDocument(paragraph(200), { maxTokens: 120 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.trim()).toMatch(/[.!?۔।]$/);
    }
  });

  it('respects the token ceiling', () => {
    const chunks = chunkDocument(paragraph(300), { maxTokens: 200, overlapTokens: 20 });
    for (const chunk of chunks) {
      // Overlap and the heading prefix are counted inside the budget, so nothing may exceed
      // it. A generous margin is allowed for the final sentence that tipped it over.
      expect(chunk.estimatedTokens).toBeLessThanOrEqual(200 + 60);
    }
  });

  it('numbers chunks contiguously from zero', () => {
    const chunks = chunkDocument(paragraph(120), { maxTokens: 100 });
    expect(chunks.map((c) => c.ordinal)).toEqual(chunks.map((_, i) => i));
  });

  it('overlaps adjacent chunks so a straddling answer survives', () => {
    const chunks = chunkDocument(paragraph(120), { maxTokens: 120, overlapTokens: 60 });
    expect(chunks.length).toBeGreaterThan(1);
    const firstTail = splitSentences(chunks[0]!.content).at(-1)!;
    expect(chunks[1]!.content).toContain(firstTail);
  });

  it('carries the heading trail into every chunk', () => {
    const doc = ['# Shipping', '', '## International', '', paragraph(40)].join('\n');
    const chunks = chunkDocument(doc, { maxTokens: 100 });
    for (const chunk of chunks) {
      expect(chunk.headings).toEqual(['Shipping', 'International']);
      // Without this, "Free over 999" retrieves for queries about pricing, not shipping.
      expect(chunk.content).toContain('Shipping › International');
    }
  });

  it('closes the previous chunk at a heading rather than mixing topics', () => {
    const doc = [
      '# Returns',
      '',
      paragraph(3, 'returns'),
      '',
      '# Shipping',
      '',
      paragraph(3, 'shipping'),
    ].join('\n');
    const chunks = chunkDocument(doc, { maxTokens: 4096 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.content).not.toContain('shipping');
    expect(chunks[1]!.content).not.toContain('returns.');
  });

  it('pops the heading stack when a shallower heading appears', () => {
    const doc = ['# A', '', '## B', '', paragraph(2), '', '# C', '', paragraph(2)].join('\n');
    const chunks = chunkDocument(doc, { maxTokens: 4096 });
    expect(chunks[0]!.headings).toEqual(['A', 'B']);
    expect(chunks.at(-1)!.headings).toEqual(['C']);
  });

  it('hard-wraps a single sentence that exceeds the ceiling instead of looping forever', () => {
    const monster = `${'word '.repeat(4000)}.`;
    const chunks = chunkDocument(monster, { maxTokens: 200 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.estimatedTokens).toBeLessThanOrEqual(400);
  });

  it('merges a runt trailing chunk into its predecessor', () => {
    const chunks = chunkDocument(`${paragraph(60)}\n\nOk.`, { maxTokens: 200, minTokens: 64 });
    // A 2-token chunk embeds to a vector that matches almost any query, so it must not stand
    // alone in the corpus.
    expect(chunks.at(-1)!.estimatedTokens).toBeGreaterThanOrEqual(64);
  });

  it('is deterministic', () => {
    const doc = ['# H', '', paragraph(80)].join('\n');
    expect(chunkDocument(doc, { maxTokens: 150 })).toEqual(chunkDocument(doc, { maxTokens: 150 }));
  });

  it('accepts a caller-supplied heading trail', () => {
    const chunks = chunkDocument(paragraph(3), { headingTrail: ['FAQ'] });
    expect(chunks[0]!.headings).toEqual(['FAQ']);
  });
});
