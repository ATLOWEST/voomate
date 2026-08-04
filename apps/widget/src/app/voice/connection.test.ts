/**
 * The socket client, against a stand-in WebSocket.
 *
 * No browser and no server: this file is about what gets written to the wire and when, which is
 * where its bugs are. The interesting ones are all about timing — a message sent before the
 * socket finished opening, a frame sent after it closed, a burst sent faster than it can drain.
 */
import { VOICE_PROTOCOL_VERSION, type ServerToClientMessage } from '@soniq/core/voice-protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceConnection } from './connection.js';

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 3;

class FakeSocket {
  static readonly CONNECTING = CONNECTING;
  static readonly OPEN = OPEN;
  static readonly CLOSED = CLOSED;

  static last: FakeSocket | undefined;

  readyState = CONNECTING;
  binaryType = 'blob';
  bufferedAmount = 0;
  sent: (string | Int16Array)[] = [];
  closedWith: { code?: number; reason?: string } | undefined;

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.last = this;
  }

  send(data: string | Int16Array): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closedWith = {
      ...(code !== undefined ? { code } : {}),
      ...(reason !== undefined ? { reason } : {}),
    };
    this.readyState = CLOSED;
    this.onclose?.();
  }

  /** Complete the handshake the way a browser would. */
  open(): void {
    this.readyState = OPEN;
    this.onopen?.();
  }

  /** The far end vanished without us asking. */
  drop(): void {
    this.readyState = CLOSED;
    this.onclose?.();
  }

  /** Text frames sent, parsed. */
  get messages(): { type: string; [key: string]: unknown }[] {
    return this.sent
      .filter((frame): frame is string => typeof frame === 'string')
      .map((frame) => JSON.parse(frame) as { type: string });
  }

  get audioFrames(): Int16Array[] {
    return this.sent.filter((frame): frame is Int16Array => typeof frame !== 'string');
  }
}

const originalWebSocket = globalThis.WebSocket;

beforeEach(() => {
  FakeSocket.last = undefined;
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
});

interface Recorded {
  messages: ServerToClientMessage[];
  audio: Int16Array[];
  closes: boolean[];
}

const build = (): { connection: VoiceConnection; recorded: Recorded } => {
  const recorded: Recorded = { messages: [], audio: [], closes: [] };
  const connection = new VoiceConnection('wss://api.test/v1/widget/voice', 'token-abc', {
    onMessage: (message) => recorded.messages.push(message),
    onAudio: (pcm) => recorded.audio.push(pcm),
    onClose: (clean) => recorded.closes.push(clean),
  });
  return { connection, recorded };
};

describe('opening', () => {
  it('sends the handshake as the first thing on the wire', () => {
    const { connection } = build();
    connection.connect({ pageUrl: 'https://shop.test/returns' });
    FakeSocket.last!.open();

    expect(FakeSocket.last!.messages).toEqual([
      {
        type: 'start',
        protocolVersion: VOICE_PROTOCOL_VERSION,
        sessionToken: 'token-abc',
        pageUrl: 'https://shop.test/returns',
      },
    ]);
  });

  it('asks for binary frames rather than blobs', () => {
    // A Blob would need an async read for every 20 ms of audio, on the same thread that is
    // scheduling playback.
    const { connection } = build();
    connection.connect();
    expect(FakeSocket.last!.binaryType).toBe('arraybuffer');
  });

  it('is not open until the browser says so', () => {
    const { connection } = build();
    connection.connect();
    expect(connection.isOpen).toBe(false);
    FakeSocket.last!.open();
    expect(connection.isOpen).toBe(true);
  });
});

describe('sending before the socket is ready', () => {
  it('holds a typed question until the handshake has gone out', () => {
    // The visitor typing is what opened the connection, so their first message is always
    // written to a socket that is still connecting. Dropping it makes the widget look like it
    // swallowed the first thing anyone said to it.
    const { connection } = build();
    connection.connect();
    connection.send({ type: 'text', content: 'do you deliver to Bristol?' });

    expect(FakeSocket.last!.messages).toEqual([]);

    FakeSocket.last!.open();

    expect(FakeSocket.last!.messages.map((message) => message.type)).toEqual(['start', 'text']);
  });

  it('does not queue audio', () => {
    // Voice is only useful live. A frame held through a connection delay arrives describing a
    // moment that has passed, and the server would transcribe it as if it were current.
    const { connection } = build();
    connection.connect();
    connection.sendAudio(new Int16Array(320));

    FakeSocket.last!.open();

    expect(FakeSocket.last!.audioFrames).toEqual([]);
  });

  it('will not accumulate a whole conversation while a socket never opens', () => {
    const { connection } = build();
    connection.connect();
    for (let i = 0; i < 50; i += 1) connection.send({ type: 'text', content: `message ${i}` });

    FakeSocket.last!.open();

    expect(FakeSocket.last!.messages.length).toBeLessThanOrEqual(9); // start + a bounded queue
  });
});

describe('audio', () => {
  it('sends the frame itself, not its backing buffer', () => {
    // A frame that is a view onto a larger buffer would otherwise put the whole buffer on the
    // wire — heard as bursts of unrelated audio, and billed as if the visitor had said it.
    const { connection } = build();
    connection.connect();
    FakeSocket.last!.open();

    const backing = new Int16Array(1000);
    const frame = backing.subarray(0, 320);
    connection.sendAudio(frame);

    expect(FakeSocket.last!.audioFrames[0]!.length).toBe(320);
  });

  it('drops frames rather than letting a stalled socket queue them', () => {
    const { connection } = build();
    connection.connect();
    FakeSocket.last!.open();

    FakeSocket.last!.bufferedAmount = 10 * 16_000;
    for (let i = 0; i < 10; i += 1) connection.sendAudio(new Int16Array(320));

    expect(FakeSocket.last!.audioFrames).toEqual([]);
    expect(connection.droppedFrames).toBe(10);
  });

  it('sends nothing once the socket has gone', () => {
    const { connection } = build();
    connection.connect();
    FakeSocket.last!.open();
    const socket = FakeSocket.last!;
    socket.drop();

    connection.sendAudio(new Int16Array(320));
    connection.send({ type: 'interrupt' });

    expect(socket.audioFrames).toEqual([]);
  });
});

describe('receiving', () => {
  it('hands up parsed control messages', () => {
    const { connection, recorded } = build();
    connection.connect();
    FakeSocket.last!.open();

    FakeSocket.last!.onmessage!({
      data: JSON.stringify({ type: 'transcript', text: 'hello', final: true }),
    });

    expect(recorded.messages).toEqual([{ type: 'transcript', text: 'hello', final: true }]);
  });

  it('survives a frame it cannot parse', () => {
    // A widget that throws here stops rendering the conversation entirely.
    const { connection, recorded } = build();
    connection.connect();
    FakeSocket.last!.open();

    expect(() => FakeSocket.last!.onmessage!({ data: 'not json' })).not.toThrow();
    expect(recorded.messages).toEqual([]);
  });

  it('reads binary frames as 16-bit samples', () => {
    const { connection, recorded } = build();
    connection.connect();
    FakeSocket.last!.open();

    const pcm = Int16Array.from([1, -1, 32767, -32768]);
    FakeSocket.last!.onmessage!({ data: pcm.buffer });

    expect(Array.from(recorded.audio[0]!)).toEqual([1, -1, 32767, -32768]);
  });

  it('discards a frame that is not whole samples', () => {
    // Reinterpreting a damaged frame plays as a burst of noise at full volume.
    const { connection, recorded } = build();
    connection.connect();
    FakeSocket.last!.open();

    FakeSocket.last!.onmessage!({ data: new ArrayBuffer(7) });

    expect(recorded.audio).toEqual([]);
  });
});

describe('closing', () => {
  it('says goodbye before hanging up', () => {
    // Without `end` the server waits out its idle timeout with a Transcribe stream open, which
    // bills by the second.
    const { connection } = build();
    connection.connect();
    FakeSocket.last!.open();
    connection.close();

    expect(FakeSocket.last!.messages.map((message) => message.type)).toEqual(['start', 'end']);
    expect(FakeSocket.last!.closedWith?.code).toBe(1000);
  });

  it('reports a close it asked for as clean', () => {
    const { connection, recorded } = build();
    connection.connect();
    FakeSocket.last!.open();
    connection.close();

    expect(recorded.closes).toEqual([true]);
  });

  it('reports a connection that dropped as not clean', () => {
    // This is the difference between saying nothing and telling the visitor to press Talk again.
    const { connection, recorded } = build();
    connection.connect();
    FakeSocket.last!.open();
    FakeSocket.last!.drop();

    expect(recorded.closes).toEqual([false]);
  });

  it('ignores a close on a connection that was never opened', () => {
    const { connection, recorded } = build();
    connection.close();
    expect(recorded.closes).toEqual([]);
  });
});

describe('the url', () => {
  it('connects to the address it was given', () => {
    const { connection } = build();
    connection.connect();
    expect(FakeSocket.last!.url).toBe('wss://api.test/v1/widget/voice');
  });
});

describe('a second connection', () => {
  it('does not replay the first one’s queue', () => {
    const { connection } = build();
    connection.connect();
    connection.send({ type: 'text', content: 'first' });
    FakeSocket.last!.open();
    const first = FakeSocket.last!;

    first.drop();
    connection.connect();
    FakeSocket.last!.open();

    expect(first).not.toBe(FakeSocket.last);
    expect(FakeSocket.last!.messages.map((message) => message.type)).toEqual(['start']);
  });
});

// Guards against a stray timer or listener keeping the module alive between tests.
afterEach(() => {
  vi.clearAllMocks();
});
