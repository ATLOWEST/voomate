import type { ServerToClientMessage } from '@soniq/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnswerRequest, AnswerResult } from '../answer.js';
import type { SpeechAudio } from './polly.js';
import {
  VoiceSession,
  type AudioTransport,
  type SessionSynthesizer,
  type SessionTranscription,
} from './session.js';

const VOICE = { voiceId: 'Kajal', languageCode: 'en-IN', engine: 'generative', degraded: false };

/** One second of audio per hundred characters — close enough for scheduling assertions. */
const fakeAudio = (text: string): SpeechAudio => ({
  pcm: Buffer.alloc(Math.max(2, Math.round(text.length * 160) * 2)),
  durationMs: Math.max(20, text.length * 10),
  text,
});

class FakeTransport implements AudioTransport {
  readonly audio: Buffer[] = [];
  readonly messages: ServerToClientMessage[] = [];
  closedWith: string | undefined;

  send(pcm: Buffer): void {
    this.audio.push(pcm);
  }
  control(message: ServerToClientMessage): void {
    this.messages.push(message);
  }
  close(reason: string): void {
    this.closedWith = reason;
  }

  typesOf(type: ServerToClientMessage['type']): ServerToClientMessage[] {
    return this.messages.filter((message) => message.type === type);
  }
  has(type: ServerToClientMessage['type']): boolean {
    return this.messages.some((message) => message.type === type);
  }
}

class FakeSynthesizer implements SessionSynthesizer {
  readonly spoken: string[] = [];
  /** Resolves synthesis after a tick unless a test wants to hold it open. */
  gate: Promise<void> | null = null;
  failOn: string | null = null;

  async synthesize(text: string): Promise<SpeechAudio> {
    if (this.gate !== null) await this.gate;
    if (this.failOn !== null && text.includes(this.failOn)) throw new Error('synthesis failed');
    this.spoken.push(text);
    return fakeAudio(text);
  }

  async phrase(kind: string): Promise<SpeechAudio> {
    const text = `[${kind}]`;
    this.spoken.push(text);
    return fakeAudio(text);
  }
}

class FakeTranscription implements SessionTranscription {
  started = false;
  stopped = false;
  readonly written: Int16Array[] = [];

  start(): void {
    this.started = true;
  }
  write(samples: Int16Array): void {
    this.written.push(samples);
  }
  stop(): void {
    this.stopped = true;
  }
}

const answerResult = (text: string, over: Partial<AnswerResult> = {}): AnswerResult => ({
  text,
  citations: [],
  ungrounded: false,
  latency: { embeddingMs: 5, retrievalMs: 10, firstTokenMs: 50, totalMs: 100 },
  ...over,
});

interface Harness {
  session: VoiceSession;
  transport: FakeTransport;
  synth: FakeSynthesizer;
  transcription: FakeTranscription;
  answers: string[];
  /** Set to control what the fake model streams, and how. */
  setAnswer: (deltas: readonly string[], final?: string) => void;
  onAnswer: (fn: (request: AnswerRequest) => Promise<AnswerResult>) => void;
  requests: AnswerRequest[];
}

const harness = (options: Partial<Parameters<typeof buildSession>[0]> = {}): Harness =>
  buildSession(options);

function buildSession(
  options: {
    greeting?: string;
    acknowledgeAfterMs?: number;
  } = {},
): Harness {
  const transport = new FakeTransport();
  const synth = new FakeSynthesizer();
  const transcription = new FakeTranscription();
  const requests: AnswerRequest[] = [];
  const answers: string[] = [];

  let deltas: readonly string[] = ['Delivery takes three days. '];
  let finalText: string | undefined;
  let custom: ((request: AnswerRequest) => Promise<AnswerResult>) | null = null;

  const session = new VoiceSession(
    {
      conversationId: 'conv-1',
      languages: ['en-IN', 'hi-IN'],
      defaultLanguage: 'en-IN',
      ...options,
    },
    {
      transport,
      synthesizer: synth,
      transcription,
      answerContext: {} as never,
      answer: async (request, onDelta) => {
        requests.push(request);
        if (custom !== null) return custom(request);
        for (const delta of deltas) {
          if (request.signal?.aborted === true) throw new Error('aborted');
          onDelta?.({ delta });
          await Promise.resolve();
        }
        const text = finalText ?? deltas.join('');
        answers.push(text);
        return answerResult(text);
      },
    },
  );

  return {
    session,
    transport,
    synth,
    transcription,
    answers,
    requests,
    setAnswer: (next, final) => {
      deltas = next;
      finalText = final;
    },
    onAnswer: (fn) => {
      custom = fn;
    },
  };
}

/** Let queued microtasks and timers settle. */
const settle = async (ms = 0): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms);
  await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
});

describe('session lifecycle', () => {
  it('starts listening before it starts greeting', async () => {
    // A visitor who talks over the greeting is common — they have used one of these before.
    // Starting transcription afterwards loses exactly those words.
    const { session, transcription } = harness({ greeting: 'Hi, how can I help?' });
    const starting = session.start(VOICE);
    expect(transcription.started).toBe(true);
    await starting;
  });

  it('announces the locked voice so the widget can show who is speaking', async () => {
    const { session, transport } = harness();
    await session.start(VOICE);

    const ready = transport.typesOf('ready')[0];
    expect(ready).toMatchObject({ type: 'ready', conversationId: 'conv-1', voice: VOICE });
  });

  it('speaks the greeting', async () => {
    const { session, synth } = harness({ greeting: 'Hi, how can I help?' });
    await session.start(VOICE);
    expect(synth.spoken).toContain('Hi, how can I help?');
  });

  it('opens silently when there is no greeting', async () => {
    const { session, synth, transport } = harness();
    await session.start(VOICE);
    expect(synth.spoken).toEqual([]);
    expect(transport.audio).toEqual([]);
  });

  it('stops transcribing and tells the client when it closes', async () => {
    const { session, transport, transcription } = harness();
    await session.start(VOICE);
    await session.close('client-ended');

    expect(transcription.stopped).toBe(true);
    expect(transport.typesOf('ended')[0]).toMatchObject({ reason: 'client-ended' });
    expect(transport.closedWith).toBe('client-ended');
  });

  it('ignores audio after closing', async () => {
    const { session, transcription } = harness();
    await session.start(VOICE);
    await session.close('done');

    const before = transcription.written.length;
    session.pushAudio(new Int16Array(320));
    expect(transcription.written.length).toBe(before);
  });
});

describe('answering a turn', () => {
  it('answers a final transcript and sends the audio', async () => {
    const { session, transport, synth } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'How long is delivery?', final: true, at: 1000 });
    await settle(500);

    expect(synth.spoken).toContain('Delivery takes three days.');
    expect(transport.audio.length).toBeGreaterThan(0);
    expect(transport.has('turn-start')).toBe(true);
    expect(transport.has('turn-end')).toBe(true);
  });

  it('never answers a partial', async () => {
    // A partial is a guess. Answering guesses is how an agent replies to half a sentence.
    const { session, transport } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'How long is', final: false, at: 1000 });
    await settle(500);

    expect(transport.has('turn-start')).toBe(false);
  });

  it('forwards the transcript to the widget whether or not it acts on it', async () => {
    const { session, transport } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'How long is', final: false, at: 1000 });
    await settle();

    expect(transport.typesOf('transcript')[0]).toMatchObject({ text: 'How long is', final: false });
  });

  it('starts speaking before generation finishes', async () => {
    // The whole latency argument. If the first sentence waits for the last one, a 1.2-second
    // reply becomes a four-second one.
    const { session, synth, setAnswer } = harness();
    setAnswer([
      'Delivery takes three days. ',
      'Returns take five working days. ',
      'Both are free over fifty pounds. ',
    ]);
    await session.start(VOICE);

    session.pushTranscript({ text: 'Tell me about delivery', final: true, at: 1000 });
    await settle(500);

    expect(synth.spoken.length).toBeGreaterThan(1);
    expect(synth.spoken[0]).toBe('Delivery takes three days.');
  });

  it('keeps the answer chunks in order', async () => {
    const { session, synth, setAnswer } = harness();
    setAnswer(['One sentence here. ', 'Two sentences here. ', 'Three sentences here. ']);
    await session.start(VOICE);

    session.pushTranscript({ text: 'Count for me', final: true, at: 1000 });
    await settle(500);

    expect(synth.spoken).toEqual([
      'One sentence here.',
      'Two sentences here.',
      'Three sentences here.',
    ]);
  });

  it('reports per-stage timing the plan can be measured against', async () => {
    const { session, transport } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'How long is delivery?', final: true, at: 1000 });
    await settle(500);

    const end = transport.typesOf('turn-end')[0];
    expect(end).toBeDefined();
    const latency = (end as { latency?: Record<string, number> }).latency;
    expect(latency?.['firstAudioMs']).toBeTypeOf('number');
    expect(latency?.['totalMs']).toBeTypeOf('number');
  });

  it('remembers both sides of the conversation', async () => {
    const { session } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'How long is delivery?', final: true, at: 1000 });
    await settle(500);

    expect(session.transcript).toEqual([
      { role: 'visitor', content: 'How long is delivery?' },
      { role: 'agent', content: 'Delivery takes three days.' },
    ]);
  });

  it('passes prior turns to the model without the question being asked', async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'First question', final: true, at: 1000 });
    await settle(500);
    session.pushTranscript({ text: 'Second question', final: true, at: 5000 });
    await settle(500);

    const second = requests[1]!;
    expect(second.question).toBe('Second question');
    expect(second.history?.map((turn) => turn.content)).toEqual([
      'First question',
      'Delivery takes three days.',
    ]);
  });

  it('asks for a voice answer, not a text one', async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'How long is delivery?', final: true, at: 1000 });
    await settle(500);

    expect(requests[0]?.channel).toBe('voice');
  });
});

describe('language', () => {
  it("answers in the language the recogniser reported, not the agent's default", async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.pushTranscript({
      text: 'डिलीवरी कितने दिन में',
      final: true,
      at: 1000,
      language: 'hi-IN',
    });
    await settle(500);

    expect(requests[0]?.language).toBe('hi-IN');
  });

  it('follows a mid-conversation switch', async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.pushTranscript({
      text: 'How long is delivery?',
      final: true,
      at: 1000,
      language: 'en-IN',
    });
    await settle(500);
    session.pushTranscript({ text: 'वापसी कितने दिन', final: true, at: 5000, language: 'hi-IN' });
    await settle(500);

    expect(requests[0]?.language).toBe('en-IN');
    expect(requests[1]?.language).toBe('hi-IN');
  });

  it('falls back to the default when nothing reports a language', async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'How long is delivery?', final: true, at: 1000 });
    await settle(500);

    expect(requests[0]?.language).toBe('en-IN');
  });
});

describe('barge-in', () => {
  it('tells the client to discard buffered audio, not just to stop sending', async () => {
    // The client's playback buffer is ahead of the server. Without this the visitor keeps
    // hearing the agent for as long as that buffer is deep — the "it doesn't stop when I
    // talk" complaint, with the server believing it stopped.
    const { session, transport, setAnswer } = harness();
    setAnswer(['A long answer that keeps going. ', 'And going. ', 'And going. ']);
    await session.start(VOICE);

    session.pushTranscript({ text: 'Tell me everything', final: true, at: 1000 });
    await settle(100);
    session.handleMessage({ type: 'interrupt' });
    await settle(100);

    expect(transport.has('cancel')).toBe(true);
  });

  it('aborts generation so nobody is billed for tokens no one will hear', async () => {
    const { session, requests, setAnswer } = harness();
    setAnswer(['One. ', 'Two. ', 'Three. ', 'Four. ']);
    await session.start(VOICE);

    session.pushTranscript({ text: 'Tell me everything', final: true, at: 1000 });
    await settle(0);
    session.handleMessage({ type: 'interrupt' });
    await settle(100);

    expect(requests[0]?.signal?.aborted).toBe(true);
  });

  it('records only what the visitor actually heard', async () => {
    // An agent that later refers back to a sentence it was cut off before saying is a
    // specific and very confusing bug.
    const { session, setAnswer } = harness();
    setAnswer(['First sentence spoken. ', 'Second sentence never heard. ']);
    await session.start(VOICE);

    session.pushTranscript({ text: 'Tell me everything', final: true, at: 1000 });
    await settle(5);
    session.handleMessage({ type: 'interrupt' });
    await settle(100);

    const agentTurns = session.transcript.filter((turn) => turn.role === 'agent');
    for (const turn of agentTurns) {
      expect(turn.content).not.toContain('never heard');
    }
  });

  it('still stops an answer that finished generating but is still playing', async () => {
    // The long window. A twenty-second answer is generated and sent in about a second; for the
    // other nineteen the visitor is listening to audio the server already finished producing.
    // If stopping only worked while generating, it would do nothing for most of every answer.
    const { session, transport, setAnswer } = harness();
    setAnswer(['A fairly long answer that takes a while to play back. ']);
    await session.start(VOICE);

    session.pushTranscript({ text: 'Tell me', final: true, at: 1000 });
    await settle(0);
    expect(transport.has('turn-end')).toBe(true); // generation is done
    expect(session.isSpeaking).toBe(true); // but the visitor is still hearing it

    session.handleMessage({ type: 'interrupt' });
    await settle(0);

    expect(transport.has('cancel')).toBe(true);
    expect(session.isSpeaking).toBe(false);
  });

  it('credits only the words that had time to reach the visitor', async () => {
    // "Sent" is not "heard". Recording the whole sent answer would have the agent believe it
    // said nine sentences the visitor was talking over.
    const { session, setAnswer } = harness();
    setAnswer(['One two three four five six seven eight nine ten. ']);
    await session.start(VOICE);

    session.pushTranscript({ text: 'Count to ten', final: true, at: 1000 });
    await settle(0);
    await settle(245); // half of the 490 ms clip

    session.handleMessage({ type: 'interrupt' });
    await settle(0);

    const agent = session.transcript.find((turn) => turn.role === 'agent');
    expect(agent?.content).toBe('One two three four five');
  });

  it('records nothing when the interrupt lands before a word could play', async () => {
    const { session, setAnswer } = harness();
    setAnswer(['Never heard a word of this. ']);
    await session.start(VOICE);

    session.pushTranscript({ text: 'Tell me', final: true, at: 1000 });
    await settle(0);
    session.handleMessage({ type: 'interrupt' });
    await settle(0);

    expect(session.transcript.filter((turn) => turn.role === 'agent')).toEqual([]);
  });

  it('does nothing when there is nothing playing', async () => {
    const { session, transport } = harness();
    await session.start(VOICE);

    session.handleMessage({ type: 'interrupt' });
    await settle();

    expect(transport.has('cancel')).toBe(false);
  });

  it('answers the new question after stopping the old one', async () => {
    const { session, requests, setAnswer } = harness();
    setAnswer(['A long answer. ', 'Still going. ']);
    await session.start(VOICE);

    session.pushTranscript({ text: 'First question', final: true, at: 1000 });
    await settle(5);
    session.pushTranscript({ text: 'Actually, different question', final: true, at: 2000 });
    await settle(200);

    expect(requests.map((request) => request.question)).toContain('Actually, different question');
  });
});

describe('speaking while thinking', () => {
  it('covers a slow answer with a cached phrase', async () => {
    const { session, synth, onAnswer } = harness({ acknowledgeAfterMs: 200 });
    onAnswer(
      async () =>
        new Promise((resolve) => setTimeout(() => resolve(answerResult('Eventually.')), 2000)),
    );
    await session.start(VOICE);

    session.pushTranscript({ text: 'Something slow', final: true, at: 1000 });
    await settle(400);

    expect(synth.spoken).toContain('[acknowledge]');
  });

  it('stays quiet when the answer is fast', async () => {
    // An agent that says "let me check" before every answer, including the fast ones, is
    // worse than the silence it was covering.
    const { session, synth } = harness({ acknowledgeAfterMs: 400 });
    await session.start(VOICE);

    session.pushTranscript({ text: 'Something fast', final: true, at: 1000 });
    await settle(1000);

    expect(synth.spoken).not.toContain('[acknowledge]');
  });

  it('does not acknowledge a turn the visitor already interrupted', async () => {
    const { session, synth, onAnswer } = harness({ acknowledgeAfterMs: 200 });
    onAnswer(
      async () =>
        new Promise((resolve) => setTimeout(() => resolve(answerResult('Eventually.')), 2000)),
    );
    await session.start(VOICE);

    session.pushTranscript({ text: 'Something slow', final: true, at: 1000 });
    await settle(50);
    session.handleMessage({ type: 'interrupt' });
    await settle(500);

    expect(synth.spoken).not.toContain('[acknowledge]');
  });
});

describe('repair and trouble', () => {
  it('asks the visitor to repeat when the transcript was too unclear to trust', async () => {
    const { session, transport, synth, requests } = harness();
    await session.start(VOICE);

    session.pushTranscript({ text: 'mumble mumble words', final: true, at: 1000, confidence: 0.2 });
    await settle(200);

    expect(transport.has('repeat-request')).toBe(true);
    expect(synth.spoken).toContain('[repair]');
    // And it must not have guessed at an answer anyway.
    expect(requests).toHaveLength(0);
  });

  it('says something rather than going silent when a turn fails', async () => {
    // Silence is indistinguishable from having crashed, and a visitor who thinks that leaves.
    const { session, transport, synth, onAnswer } = harness();
    onAnswer(async () => {
      throw new Error('Bedrock is having a day');
    });
    await session.start(VOICE);

    session.pushTranscript({ text: 'How long is delivery?', final: true, at: 1000 });
    await settle(200);

    expect(synth.spoken).toContain('[trouble]');
    expect(transport.typesOf('error')[0]).toMatchObject({ code: 'turn_failed', fatal: false });
  });

  it('finishes the answer when one chunk fails to synthesise', async () => {
    const { session, synth, setAnswer } = harness();
    setAnswer(['First sentence here. ', 'Broken sentence here. ', 'Third sentence here. ']);
    synth.failOn = 'Broken';
    await session.start(VOICE);

    session.pushTranscript({ text: 'Tell me', final: true, at: 1000 });
    await settle(500);

    expect(synth.spoken).toContain('First sentence here.');
    expect(synth.spoken).toContain('Third sentence here.');
  });
});

describe('typed input', () => {
  it('answers a typed question', async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.handleMessage({ type: 'text', content: 'How long is delivery?' });
    await settle(500);

    expect(requests[0]?.question).toBe('How long is delivery?');
  });

  it('ignores an empty typed message', async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.handleMessage({ type: 'text', content: '   ' });
    await settle(200);

    expect(requests).toHaveLength(0);
  });

  it('drops transcripts while muted', async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.handleMessage({ type: 'mute', muted: true });
    session.pushTranscript({ text: 'How long is delivery?', final: true, at: 1000 });
    await settle(200);

    expect(requests).toHaveLength(0);
  });

  it('listens again after unmuting', async () => {
    const { session, requests } = harness();
    await session.start(VOICE);

    session.handleMessage({ type: 'mute', muted: true });
    session.handleMessage({ type: 'mute', muted: false });
    session.pushTranscript({ text: 'How long is delivery?', final: true, at: 1000 });
    await settle(200);

    expect(requests).toHaveLength(1);
  });
});

describe('audio routing', () => {
  it('gives every frame to the recogniser', async () => {
    const { session, transcription } = harness();
    await session.start(VOICE);

    session.pushAudio(new Int16Array(320));
    session.pushAudio(new Int16Array(320));

    expect(transcription.written).toHaveLength(2);
  });
});
