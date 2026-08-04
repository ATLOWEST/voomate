import { describe, expect, it } from 'vitest';
import { SentenceStreamer, forSpeech, splitForSpeech, stripMarkdown } from './speech.js';

describe('stripMarkdown', () => {
  it('removes emphasis but keeps the words', () => {
    expect(stripMarkdown('**Free delivery** over _fifty pounds_')).toBe(
      'Free delivery over fifty pounds',
    );
  });

  it('keeps a link label and drops the URL', () => {
    expect(
      stripMarkdown('See our [returns policy](https://acme.example/returns) for details'),
    ).toBe('See our returns policy for details');
  });

  it('removes list markers', () => {
    expect(stripMarkdown('- Red\n- Blue\n1. First')).toBe('Red\nBlue\nFirst');
  });

  it('removes heading hashes', () => {
    expect(stripMarkdown('## Refunds')).toBe('Refunds');
  });

  it('keeps code contents without the backticks', () => {
    expect(stripMarkdown('Use the code `SAVE10` at checkout')).toBe(
      'Use the code SAVE10 at checkout',
    );
  });

  it('turns a table row into something sayable', () => {
    expect(stripMarkdown('| Standard | 3-5 days |')).toBe(' Standard ,  3-5 days ');
  });

  it('leaves an apostrophe and a hyphen alone', () => {
    // The underscore/asterisk rules must not chew ordinary punctuation.
    expect(stripMarkdown("It's a well-known brand")).toBe("It's a well-known brand");
  });
});

describe('forSpeech', () => {
  it('replaces a URL rather than spelling it out', () => {
    expect(forSpeech('Read more at https://acme.example/returns/policy')).toBe(
      'Read more at the link on screen',
    );
  });

  it('replaces an email address', () => {
    expect(forSpeech('Write to help@acme.example')).toBe('Write to the email address on screen');
  });

  it('removes emoji', () => {
    expect(forSpeech('Free delivery 🎉 today')).toBe('Free delivery today');
  });

  it('is idempotent', () => {
    const once = forSpeech('**Free** delivery at https://acme.example 🎉');
    expect(forSpeech(once)).toBe(once);
  });

  it('leaves plain prose untouched', () => {
    const plain = 'You can return an item within thirty days of delivery.';
    expect(forSpeech(plain)).toBe(plain);
  });
});

describe('SentenceStreamer', () => {
  it('emits a sentence as soon as it is complete, not when generation ends', () => {
    const streamer = new SentenceStreamer();
    expect(streamer.feed('Delivery takes three days. ')).toEqual(['Delivery takes three days.']);
  });

  it('holds an incomplete sentence', () => {
    const streamer = new SentenceStreamer();
    expect(streamer.feed('Delivery takes')).toEqual([]);
  });

  it('reassembles sentences split across deltas', () => {
    const streamer = new SentenceStreamer();
    expect(streamer.feed('Delivery takes ')).toEqual([]);
    expect(streamer.feed('three days.')).toEqual([]);
    expect(streamer.feed(' Returns take five.')).toEqual(['Delivery takes three days.']);
  });

  it('does not split a decimal', () => {
    const streamer = new SentenceStreamer();
    streamer.feed('The item weighs 3.5 kilos and ships free. ');
    expect(streamer.chunksEmitted).toBe(1);
  });

  it('does not split an abbreviation', () => {
    const streamer = new SentenceStreamer();
    const chunks = streamer.feed('Contact Dr. Patel about the order. ');
    expect(chunks).toEqual(['Contact Dr. Patel about the order.']);
  });

  it('splits Japanese, which has no space after its full stop', () => {
    // The regression this guards: requiring whitespace after a terminator means CJK answers
    // never split, synthesise as one block, and triple the time to first audio.
    const streamer = new SentenceStreamer({ minChunkChars: 2 });
    const chunks = streamer.feed('配送は三日かかります。返品は五日です。');
    expect(chunks).toEqual(['配送は三日かかります。', '返品は五日です。']);
  });

  it('splits Hindi at the danda', () => {
    const streamer = new SentenceStreamer({ minChunkChars: 2 });
    const chunks = streamer.feed('डिलीवरी तीन दिन में होती है। वापसी पाँच दिन में।');
    expect(chunks[0]).toBe('डिलीवरी तीन दिन में होती है।');
  });

  it('splits at an Arabic question mark', () => {
    const streamer = new SentenceStreamer({ minChunkChars: 2 });
    const chunks = streamer.feed('هل تريد المساعدة؟ يمكنني الشرح.');
    expect(chunks[0]).toBe('هل تريد المساعدة؟');
  });

  it('breaks a long opening sentence at a clause so the visitor hears something sooner', () => {
    const streamer = new SentenceStreamer();
    const chunks = streamer.feed(
      'Our standard delivery within the United Kingdom takes three to five working days, and express delivery arrives the next working day.',
    );
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toBe(
      'Our standard delivery within the United Kingdom takes three to five working days,',
    );
  });

  it('does not clause-break later sentences — only the one being waited on', () => {
    const streamer = new SentenceStreamer();
    streamer.feed('Yes, we do. ');
    const chunks = streamer.feed(
      'Our standard delivery within the United Kingdom takes three to five working days, and express arrives next day',
    );
    expect(chunks).toEqual([]);
  });

  it('never buffers forever when the model does not punctuate', () => {
    const streamer = new SentenceStreamer({ maxChunkChars: 60 });
    const chunks = streamer.feed('a'.repeat(200));
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('cleans each chunk on the way out', () => {
    const streamer = new SentenceStreamer();
    expect(streamer.feed('**Free delivery** over fifty pounds. ')).toEqual([
      'Free delivery over fifty pounds.',
    ]);
  });

  it('returns the tail on flush', () => {
    const streamer = new SentenceStreamer();
    streamer.feed('Delivery takes three days. And then');
    expect(streamer.flush()).toBe('And then');
  });

  it('flushes to null when nothing is left', () => {
    const streamer = new SentenceStreamer();
    streamer.feed('Delivery takes three days. ');
    expect(streamer.flush()).toBeNull();
  });

  it('holds back a fragment too short to be worth its own synthesis call', () => {
    const streamer = new SentenceStreamer({ minChunkChars: 12 });
    streamer.feed('This is the first sentence here. ');
    // "Yes." on its own is a round trip for four characters, and sounds clipped.
    expect(streamer.feed('Yes. ')).toEqual([]);
    expect(streamer.feed('It ships free today. ')).toEqual(['Yes. It ships free today.']);
  });
});

describe('splitForSpeech', () => {
  it('splits a complete text in one call', () => {
    expect(splitForSpeech('Hello there. How can I help you today?', { minChunkChars: 2 })).toEqual([
      'Hello there.',
      'How can I help you today?',
    ]);
  });

  it('returns a single chunk for a short greeting', () => {
    expect(splitForSpeech('Hi, how can I help?')).toEqual(['Hi, how can I help?']);
  });

  it('returns nothing for empty text', () => {
    expect(splitForSpeech('   ')).toEqual([]);
  });
});
