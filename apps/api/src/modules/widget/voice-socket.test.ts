/**
 * The socket's gate, tested over a real WebSocket.
 *
 * Everything below the transport is faked — Bedrock, Polly and Transcribe are not involved.
 * What is exercised is the part that only exists here: who is allowed to open a voice session,
 * and whether a refused one leaves anything running.
 */
import type { AgentId, OrganizationId, ServerToClientMessage } from '@voomate/core';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

const SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
process.env['WIDGET_TOKEN_SECRET'] = SECRET;
process.env['WIDGET_TOKEN_TTL_SECONDS'] = '900';
process.env['WIDGET_ORIGIN'] = 'https://widget.voomate.local';

const ORIGIN = 'https://shop.example.com';

const fakes = vi.hoisted(() => ({
  /** The row `getDb()` will return. Tests reshape it per case. */
  agent: {} as Record<string, unknown>,
  /** The live fake transcription, so a test can push a transcript through the real session. */
  transcription: undefined as { onResult: (result: unknown) => void } | undefined,
  answer: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([fakes.agent].filter((row) => 'id' in row)) }),
      }),
    }),
  }),
}));

vi.mock('../../lib/answer.js', () => ({ answerQuestion: fakes.answer }));

vi.mock('../../lib/voice/polly.js', () => ({
  lockVoice: () => ({
    voiceId: 'Kajal',
    languageCode: 'en-IN',
    engine: 'generative',
    degraded: false,
    bilingual: true,
  }),
  Synthesizer: class {
    get lockedVoice() {
      return { voiceId: 'Kajal', languageCode: 'en-IN', engine: 'generative', degraded: false };
    }
    async prewarm(): Promise<void> {}
    async synthesize(text: string) {
      return { pcm: Buffer.alloc(320, 1), durationMs: 20, text };
    }
    async phrase(kind: string) {
      return { pcm: Buffer.alloc(320, 2), durationMs: 20, text: `[${kind}]` };
    }
  },
}));

vi.mock('../../lib/voice/transcribe.js', () => ({
  TranscriptionStream: class {
    constructor(_options: unknown, handlers: { onResult: (result: unknown) => void }) {
      fakes.transcription = handlers;
    }
    start(): void {}
    write(): void {}
    stop(): void {}
  },
}));

const { mintWidgetToken } = await import('./token.js');
const { voiceSocketRoutes } = await import('./voice-socket.js');

const publishedAgent = () => ({
  id: 'agent-123',
  organizationId: 'org-456',
  status: 'published',
  voiceEnabled: true,
  language: {
    languages: ['en-IN', 'hi-IN'],
    primaryLanguage: 'en-IN',
    codeSwitching: true,
  },
  persona: { displayName: 'Support', greeting: 'Hi, how can I help?' },
});

let app: FastifyInstance;
let url: string;

beforeEach(async () => {
  Object.assign(fakes.agent, publishedAgent());
  fakes.transcription = undefined;
  fakes.answer.mockReset();
  fakes.answer.mockResolvedValue({
    text: 'Delivery takes three days.',
    citations: [],
    ungrounded: false,
    latency: { embeddingMs: 1, retrievalMs: 1, firstTokenMs: 1, totalMs: 1 },
  });

  app = Fastify({ logger: false });
  await app.register(import('@fastify/websocket'));
  await app.register(voiceSocketRoutes, { prefix: '/v1/widget' });
  await app.listen({ port: 0, host: '127.0.0.1' });

  const address = app.server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  url = `ws://127.0.0.1:${port}/v1/widget/voice`;
});

afterEach(async () => {
  await app.close();
});

const token = async (over: Partial<{ origin: string; channel: 'voice' | 'text' }> = {}) =>
  (
    await mintWidgetToken(
      {
        agentId: 'agent-123' as AgentId,
        organizationId: 'org-456' as OrganizationId,
        origin: over.origin ?? ORIGIN,
        channel: over.channel ?? 'voice',
      },
      { secret: SECRET, ttlSeconds: 900 },
    )
  ).token;

interface Connection {
  socket: WebSocket;
  control: ServerToClientMessage[];
  audio: Buffer[];
  closed: Promise<{ code: number; reason: string }>;
  /** Resolves once a message of this type arrives, or rejects when the socket closes first. */
  waitFor: (type: string, timeoutMs?: number) => Promise<ServerToClientMessage>;
  /**
   * Like `waitFor`, but only counts messages that arrive from now on.
   *
   * The greeting is a turn, so it produces its own `turn-start`/`turn-end` before the visitor
   * has said anything. Anything asserting about *an answer* has to skip past those.
   */
  waitForNext: (type: string, timeoutMs?: number) => Promise<ServerToClientMessage>;
}

/** `null` means connect with no Origin header at all — the non-browser client case. */
const connect = async (origin: string | null = ORIGIN): Promise<Connection> => {
  const socket = new WebSocket(url, {
    headers: origin === null ? {} : { origin },
  });
  const control: ServerToClientMessage[] = [];
  const audio: Buffer[] = [];
  const waiters: { type: string; resolve: (message: ServerToClientMessage) => void }[] = [];

  socket.on('message', (data: Buffer, isBinary: boolean) => {
    if (isBinary) {
      audio.push(data);
      return;
    }
    const message = JSON.parse(data.toString('utf8')) as ServerToClientMessage;
    control.push(message);
    for (const waiter of waiters.filter((entry) => entry.type === message.type)) {
      waiter.resolve(message);
    }
  });

  const closed = new Promise<{ code: number; reason: string }>((resolve) => {
    socket.on('close', (code, reason) => resolve({ code, reason: reason.toString('utf8') }));
  });

  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  const pending = (type: string, timeoutMs: number): Promise<ServerToClientMessage> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`no ${type} within ${timeoutMs}ms`)),
        timeoutMs,
      );
      waiters.push({
        type,
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        },
      });
      void closed.then(() => clearTimeout(timer));
    });

  return {
    socket,
    control,
    audio,
    closed,
    waitFor: (type, timeoutMs = 2000) => {
      const existing = control.find((message) => message.type === type);
      if (existing !== undefined) return Promise.resolve(existing);
      return pending(type, timeoutMs);
    },
    waitForNext: (type, timeoutMs = 2000) => pending(type, timeoutMs),
  };
};

const start = (connection: Connection, over: Record<string, unknown> = {}): void => {
  connection.socket.send(
    JSON.stringify({ type: 'start', protocolVersion: 1, sessionToken: '', ...over }),
  );
};

describe('opening a voice session', () => {
  it('accepts a valid handshake and names the voice it locked', async () => {
    const connection = await connect();
    start(connection, { sessionToken: await token() });

    const ready = await connection.waitFor('ready');
    expect(ready).toMatchObject({
      type: 'ready',
      protocolVersion: 1,
      voice: { voiceId: 'Kajal', degraded: false },
    });
    connection.socket.close();
  });

  it('speaks the greeting as binary audio', async () => {
    // Binary both ways is the point of the transport. A greeting that arrives as JSON means
    // something is base64-ing audio, which costs a third of the bandwidth for nothing.
    const connection = await connect();
    start(connection, { sessionToken: await token() });
    await connection.waitFor('turn-end');

    expect(connection.audio.length).toBeGreaterThan(0);
    expect(Buffer.isBuffer(connection.audio[0])).toBe(true);
    connection.socket.close();
  });
});

describe('refusing a voice session', () => {
  const refusal = async (connection: Connection) => {
    const error = await connection.waitFor('error');
    const close = await connection.closed;
    return { error, close };
  };

  it('refuses a token minted for a different website', async () => {
    // The expensive case. A token lifted from a merchant's page and replayed from elsewhere
    // would otherwise buy the thief a metered Bedrock session on the merchant's bill.
    const connection = await connect('https://attacker.example');
    start(connection, { sessionToken: await token({ origin: ORIGIN }) });

    const { error, close } = await refusal(connection);
    expect(error).toMatchObject({ type: 'error', fatal: true });
    expect(close.code).toBe(1008);
  });

  it('refuses a connection with no Origin header', async () => {
    const connection = await connect(null);
    start(connection, { sessionToken: await token() });

    const { close } = await refusal(connection);
    expect(close.code).toBe(1008);
  });

  it('refuses a text-channel token', async () => {
    // Channels are priced differently. A text token must not become a voice session.
    const connection = await connect();
    start(connection, { sessionToken: await token({ channel: 'text' }) });

    const { error } = await refusal(connection);
    expect(error).toMatchObject({ code: 'wrong_channel' });
  });

  it('refuses a widget speaking a different protocol version', async () => {
    const connection = await connect();
    start(connection, { sessionToken: await token(), protocolVersion: 99 });

    const { error } = await refusal(connection);
    expect(error).toMatchObject({ code: 'protocol_version' });
  });

  it('refuses an agent that has been unpublished since the token was minted', async () => {
    // Tokens outlive decisions. A fifteen-minute token must not keep a withdrawn agent live.
    fakes.agent['status'] = 'draft';
    const connection = await connect();
    start(connection, { sessionToken: await token() });

    const { error } = await refusal(connection);
    expect(error).toMatchObject({ code: 'unavailable' });
  });

  it('refuses an agent with voice switched off', async () => {
    fakes.agent['voiceEnabled'] = false;
    const connection = await connect();
    start(connection, { sessionToken: await token() });

    const { error } = await refusal(connection);
    expect(error).toMatchObject({ code: 'unavailable' });
  });

  it('refuses a token for an agent in another organisation', async () => {
    fakes.agent['organizationId'] = 'org-somebody-else';
    const connection = await connect();
    start(connection, { sessionToken: await token() });

    const { error } = await refusal(connection);
    expect(error).toMatchObject({ code: 'not_found' });
  });

  it('never starts transcription for a refused session', async () => {
    // The bill. A Transcribe stream opened before the checks would run — and be charged for —
    // on a connection that was about to be rejected.
    const connection = await connect('https://attacker.example');
    start(connection, { sessionToken: await token() });
    await connection.closed;

    expect(fakes.transcription).toBeUndefined();
  });
});

describe('carrying a conversation', () => {
  it('answers a transcript and returns audio over the same socket', async () => {
    const connection = await connect();
    start(connection, { sessionToken: await token() });
    await connection.waitFor('turn-end'); // the greeting

    const answered = connection.waitForNext('turn-end');
    fakes.transcription?.onResult({
      text: 'How long is delivery?',
      final: true,
      at: Date.now(),
      confidence: 0.95,
    });

    expect(await answered).toMatchObject({ text: 'Delivery takes three days.' });
    expect(connection.audio.length).toBeGreaterThan(0);
    connection.socket.close();
  });

  it('accepts a typed question on the voice socket', async () => {
    // The text fallback has to work on the connection the visitor already has — a broken
    // microphone must not mean starting over.
    const connection = await connect();
    start(connection, { sessionToken: await token() });
    await connection.waitFor('turn-end'); // the greeting

    const answered = connection.waitForNext('turn-end');
    connection.socket.send(JSON.stringify({ type: 'text', content: 'How long is delivery?' }));
    await answered;
    expect(fakes.answer).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'How long is delivery?', channel: 'voice' }),
      expect.anything(),
    );
    connection.socket.close();
  });

  it('ignores audio that arrives before the handshake', async () => {
    // Not an error — a widget that opens the microphone eagerly is doing the right thing for
    // latency. The frames are simply dropped until there is a session to receive them.
    const connection = await connect();
    connection.socket.send(Buffer.alloc(640), { binary: true });
    start(connection, { sessionToken: await token() });

    await expect(connection.waitFor('ready')).resolves.toMatchObject({ type: 'ready' });
    connection.socket.close();
  });

  it('shuts down cleanly when the visitor ends the call', async () => {
    const connection = await connect();
    start(connection, { sessionToken: await token() });
    await connection.waitFor('ready');

    connection.socket.send(JSON.stringify({ type: 'end' }));

    const ended = await connection.waitFor('ended');
    expect(ended).toMatchObject({ reason: 'client-ended' });
    await expect(connection.closed).resolves.toMatchObject({ code: 1000 });
  });

  it('ignores a frame that is not valid JSON', async () => {
    const connection = await connect();
    start(connection, { sessionToken: await token() });
    await connection.waitFor('ready');

    await connection.waitFor('turn-end'); // the greeting

    const answered = connection.waitForNext('turn-end');
    connection.socket.send('}{ not json');
    connection.socket.send(JSON.stringify({ type: 'text', content: 'Still here?' }));

    await expect(answered).resolves.toBeDefined();
    connection.socket.close();
  });
});
