import { describe, expect, it } from 'vitest';
import { TurnEngine, isBackchannel, isNoise, looksLikeEcho, type TurnDecision } from './turn.js';

/** Readable assertions: most tests care which decisions came back, not their payloads. */
const kinds = (decisions: readonly TurnDecision[]): string[] => decisions.map((d) => d.kind);

/** A session where the agent is mid-sentence, having said `spoken` so far. */
const speaking = (spoken: string, at = 1000): TurnEngine => {
  const engine = new TurnEngine();
  engine.handle({ kind: 'agent-speaking-started', turnId: 't1', at });
  engine.noteSpoken(spoken);
  return engine;
};

describe('isBackchannel', () => {
  it('recognises agreement in every launch language', () => {
    for (const word of ['mm-hmm', 'okay', 'haan', 'theek hai', 'claro', 'oui', 'genau', 'はい']) {
      expect(isBackchannel(word), word).toBe(true);
    }
  });

  it('does not swallow a one-word question', () => {
    // The bug this guards: treating every short utterance as a backchannel. A visitor whose
    // one-word questions vanish concludes the agent is broken.
    for (const word of ['price?', 'shoes', 'returns?', 'when', 'kitna']) {
      expect(isBackchannel(word), word).toBe(false);
    }
  });

  it('ignores surrounding punctuation and case', () => {
    expect(isBackchannel('  Okay. ')).toBe(true);
  });

  it('keeps internal apostrophes, which some languages need', () => {
    expect(isBackchannel("d'accord")).toBe(true);
  });
});

describe('isNoise', () => {
  it('rejects utterances with no letters', () => {
    expect(isNoise('...')).toBe(true);
    expect(isNoise('???')).toBe(true);
  });

  it('rejects a stuck vowel', () => {
    expect(isNoise('aaaaa')).toBe(true);
    expect(isNoise('uhhh')).toBe(true);
  });

  it('keeps real words that happen to be short', () => {
    expect(isNoise('no')).toBe(false);
    expect(isNoise('hi')).toBe(false);
  });

  it('keeps non-Latin scripts', () => {
    expect(isNoise('कितना')).toBe(false);
    expect(isNoise('返品')).toBe(false);
  });
});

describe('looksLikeEcho', () => {
  const agent = 'You can return an item within thirty days from the delivery date';

  it('matches a run of words the agent just said', () => {
    expect(looksLikeEcho('within thirty days from the delivery date', agent)).toBe(true);
  });

  it('matches a lossy pickup with words dropped', () => {
    expect(looksLikeEcho('return item within thirty days delivery', agent)).toBe(true);
  });

  it('lets a fast human reply through', () => {
    // The whole reason this is a matcher and not a blanket mute: the visitor answering
    // immediately is what a good conversation sounds like.
    expect(looksLikeEcho('what about exchanges', agent)).toBe(false);
  });

  it('does not guess on a single word', () => {
    // "days" echoed and "days?" asked are indistinguishable. Other filters handle those.
    expect(looksLikeEcho('days', agent)).toBe(false);
  });

  it('is not fooled by a reply that shares a couple of words', () => {
    expect(looksLikeEcho('can I return two items', agent)).toBe(false);
  });
});

describe('barge-in', () => {
  it('ducks the moment the visitor speaks over the agent, before knowing what they said', () => {
    const engine = speaking('You can return an item');
    expect(kinds(engine.handle({ kind: 'speech-started', at: 1100 }))).toEqual(['duck']);
  });

  it('does not duck when the agent is not speaking', () => {
    const engine = new TurnEngine();
    expect(engine.handle({ kind: 'speech-started', at: 1000 })).toEqual([]);
  });

  it('ducks only once per turn', () => {
    const engine = speaking('You can return an item');
    engine.handle({ kind: 'speech-started', at: 1100 });
    expect(engine.handle({ kind: 'speech-started', at: 1200 })).toEqual([]);
  });

  it('stops the agent when the interruption turns out to be real words', () => {
    const engine = speaking('You can return an item');
    engine.handle({ kind: 'speech-started', at: 1100 });
    const decisions = engine.handle({ kind: 'partial', text: 'what about exchanges', at: 1200 });
    expect(kinds(decisions)).toEqual(['interrupt']);
    expect(engine.isAgentSpeaking).toBe(false);
  });

  it('truncates history to what the visitor actually heard', () => {
    // The visitor is responding to the half sentence they heard, not to the half we had
    // queued but never played. Keeping the untruncated text makes the next answer reference
    // things that were never said out loud.
    const engine = speaking('You can return an item within thirty days');
    engine.handle({ kind: 'speech-started', at: 1100 });
    const [decision] = engine.handle({ kind: 'partial', text: 'what about exchanges', at: 1200 });
    expect(decision).toEqual({
      kind: 'interrupt',
      turnId: 't1',
      heard: 'You can return an item within thirty days',
    });
  });

  it('resumes at full volume when the interruption was only agreement', () => {
    const engine = speaking('You can return an item');
    engine.handle({ kind: 'speech-started', at: 1100 });
    engine.handle({ kind: 'speech-stopped', at: 1150 });
    expect(kinds(engine.handle({ kind: 'partial', text: 'mm-hmm', at: 1200 }))).toEqual(['unduck']);
    expect(engine.isAgentSpeaking).toBe(true);
  });

  it('does not pump the volume while the visitor is still saying "yeah, yeah"', () => {
    const engine = speaking('You can return an item');
    engine.handle({ kind: 'speech-started', at: 1100 });
    // Still speaking — unducking now would lurch back to full volume mid-word.
    expect(engine.handle({ kind: 'partial', text: 'yeah', at: 1200 })).toEqual([]);
  });

  it('stays ducked while the partial is still our own echo', () => {
    const engine = speaking('You can return an item within thirty days');
    engine.handle({ kind: 'speech-started', at: 1100 });
    expect(
      engine.handle({ kind: 'partial', text: 'return an item within thirty', at: 1200 }),
    ).toEqual([]);
    expect(engine.isAgentSpeaking).toBe(true);
  });

  it('stops on a final even when voice activity detection missed the start', () => {
    // A quiet interruption may produce no speech-started at all. The final still has to stop it.
    const engine = speaking('You can return an item');
    const decisions = engine.handle({ kind: 'final', text: 'what about exchanges', at: 1300 });
    expect(kinds(decisions)).toEqual(['interrupt', 'answer']);
    expect(decisions[1]).toMatchObject({ kind: 'answer', interrupted: true });
  });

  it('resumes when a completed utterance turns out to be a backchannel', () => {
    const engine = speaking('You can return an item');
    engine.handle({ kind: 'speech-started', at: 1100 });
    const decisions = engine.handle({ kind: 'final', text: 'okay', at: 1300 });
    expect(kinds(decisions)).toEqual(['unduck', 'ignore']);
    expect(engine.isAgentSpeaking).toBe(true);
  });

  it('stops immediately when the visitor presses the button', () => {
    const engine = speaking('You can return an item');
    expect(kinds(engine.handle({ kind: 'manual-interrupt', at: 1100 }))).toEqual(['interrupt']);
  });

  it('ignores the stop button when nothing is playing', () => {
    const engine = new TurnEngine();
    expect(engine.handle({ kind: 'manual-interrupt', at: 1000 })).toEqual([
      { kind: 'ignore', reason: 'agent-not-speaking' },
    ]);
  });
});

describe('echo rejection', () => {
  it('does not answer the agent hearing itself just after it stops', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'agent-speaking-started', turnId: 't1', at: 1000 });
    engine.handle({
      kind: 'agent-speaking-stopped',
      at: 2000,
      spoken: 'You can return an item within thirty days from the delivery date',
    });
    const decisions = engine.handle({
      kind: 'final',
      text: 'within thirty days from the delivery date',
      at: 2200,
    });
    expect(decisions).toEqual([{ kind: 'ignore', reason: 'echo' }]);
  });

  it('answers a fast human reply in the same window', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'agent-speaking-started', turnId: 't1', at: 1000 });
    engine.handle({ kind: 'agent-speaking-stopped', at: 2000, spoken: 'You can return an item' });
    expect(kinds(engine.handle({ kind: 'final', text: 'what about exchanges', at: 2200 }))).toEqual(
      ['answer'],
    );
  });

  it('stops suspecting echo once the window has passed', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'agent-speaking-started', turnId: 't1', at: 1000 });
    engine.handle({
      kind: 'agent-speaking-stopped',
      at: 2000,
      spoken: 'You can return an item within thirty days',
    });
    // Same words, but seconds later — the visitor is reading the answer back, not an echo.
    expect(
      kinds(engine.handle({ kind: 'final', text: 'return an item within thirty days', at: 6000 })),
    ).toEqual(['answer']);
  });

  it('widens the window when the browser has no echo cancellation', () => {
    const engine = new TurnEngine({ echoCancellationUnavailable: true });
    engine.handle({ kind: 'agent-speaking-started', turnId: 't1', at: 1000 });
    engine.handle({
      kind: 'agent-speaking-stopped',
      at: 2000,
      spoken: 'You can return an item within thirty days',
    });
    // 1.1s later: outside the normal 700ms guard, inside the doubled one.
    expect(
      engine.handle({ kind: 'final', text: 'return an item within thirty days', at: 3100 }),
    ).toEqual([{ kind: 'ignore', reason: 'echo' }]);
  });
});

describe('accepting a turn', () => {
  it('answers ordinary speech', () => {
    const engine = new TurnEngine();
    expect(
      engine.handle({ kind: 'final', text: 'how long do I have to return', at: 1000 }),
    ).toEqual([{ kind: 'answer', text: 'how long do I have to return' }]);
  });

  it('collapses the whitespace a transcript arrives with', () => {
    const engine = new TurnEngine();
    const [decision] = engine.handle({ kind: 'final', text: '  how  long \n is it ', at: 1000 });
    expect(decision).toEqual({ kind: 'answer', text: 'how long is it' });
  });

  it('asks for a repeat rather than answering a transcript it does not trust', () => {
    const engine = new TurnEngine();
    const decisions = engine.handle({
      kind: 'final',
      text: 'can I return the blue one',
      at: 1000,
      confidence: 0.2,
    });
    expect(kinds(decisions)).toEqual(['request-repeat']);
  });

  it('still stops the agent when the interrupting words were unclear', () => {
    // Stopping is right regardless of whether we understood them — the visitor is talking.
    const engine = speaking('You can return an item');
    const decisions = engine.handle({
      kind: 'final',
      text: 'wait hold on a second',
      at: 1300,
      confidence: 0.1,
    });
    expect(kinds(decisions)).toEqual(['interrupt', 'request-repeat']);
  });

  it('drops a final that repeats itself after a stream restart', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'final', text: 'what is the delivery time', at: 1000 });
    expect(engine.handle({ kind: 'final', text: 'what is the delivery time', at: 1500 })).toEqual([
      { kind: 'ignore', reason: 'duplicate' },
    ]);
  });

  it('lets the same question be asked again later', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'final', text: 'what is the delivery time', at: 1000 });
    expect(
      kinds(engine.handle({ kind: 'final', text: 'what is the delivery time', at: 20_000 })),
    ).toEqual(['answer']);
  });

  it('drops everything while the microphone is muted', () => {
    const engine = new TurnEngine();
    engine.setMuted(true);
    expect(engine.handle({ kind: 'final', text: 'hello there', at: 1000 })).toEqual([
      { kind: 'ignore', reason: 'muted' },
    ]);
  });
});

describe('language', () => {
  it('follows the language the stream reports, not a guess from the words', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'final', text: 'kitna time lagega', at: 1000, language: 'hi-IN' });
    expect(engine.currentLanguage).toBe('hi-IN');
  });

  it('follows a switch mid-conversation', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'final', text: 'how long is delivery', at: 1000, language: 'en-IN' });
    const [decision] = engine.handle({
      kind: 'final',
      text: 'aur return ka kya',
      at: 5000,
      language: 'hi-IN',
    });
    expect(decision).toMatchObject({ kind: 'answer', language: 'hi-IN' });
  });

  it('keeps the last known language when the stream reports none', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'final', text: 'kitna time lagega', at: 1000, language: 'hi-IN' });
    const [decision] = engine.handle({ kind: 'final', text: 'aur delivery', at: 5000 });
    expect(decision).toMatchObject({ language: 'hi-IN' });
  });

  it('asks for a repeat in the language it last heard', () => {
    const engine = new TurnEngine();
    engine.handle({ kind: 'final', text: 'kitna time lagega', at: 1000, language: 'hi-IN' });
    const decisions = engine.handle({
      kind: 'final',
      text: 'kuch aur bhi',
      at: 5000,
      confidence: 0.1,
    });
    expect(decisions).toEqual([{ kind: 'request-repeat', language: 'hi-IN' }]);
  });
});

describe('typed input on a voice connection', () => {
  it('answers typed text', () => {
    const engine = new TurnEngine();
    expect(engine.handle({ kind: 'text', text: 'do you ship to Ireland', at: 1000 })).toEqual([
      { kind: 'answer', text: 'do you ship to Ireland' },
    ]);
  });

  it('stops the agent first — someone typing has stopped listening', () => {
    const engine = speaking('You can return an item');
    expect(
      kinds(engine.handle({ kind: 'text', text: 'do you ship to Ireland', at: 1100 })),
    ).toEqual(['interrupt', 'answer']);
  });

  it('ignores an empty submission', () => {
    const engine = new TurnEngine();
    expect(engine.handle({ kind: 'text', text: '   ', at: 1000 })).toEqual([
      { kind: 'ignore', reason: 'empty' },
    ]);
  });
});
