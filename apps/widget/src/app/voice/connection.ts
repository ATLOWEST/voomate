/**
 * The socket, from the browser's side.
 *
 * Thin on purpose, and the mirror of `apps/api/src/modules/widget/voice-socket.ts`: JSON text
 * frames for control, binary frames for audio, in the order the server sent them. Nothing here
 * makes decisions about the conversation — it moves bytes and hands typed messages upward, so
 * that swapping this transport for WebRTC later touches this file and nothing else (ADR 0006).
 */
import {
  type ClientToServerMessage,
  type ServerToClientMessage,
  VOICE_PROTOCOL_VERSION,
} from '@voomate/core/voice-protocol';

/**
 * Cap on outgoing audio held by the socket.
 *
 * A stalled connection otherwise grows a buffer of microphone frames without limit, and when it
 * recovers the server receives a burst of stale audio and answers a question the visitor asked
 * a minute ago. Dropping frames is the better failure: a gap is recoverable, a time warp is not.
 */
const MAX_BUFFERED_BYTES = 2 * 16_000 * 2;

export interface ConnectionHandlers {
  onMessage: (message: ServerToClientMessage) => void;
  onAudio: (pcm: Int16Array) => void;
  onOpen?: () => void;
  /** The socket is gone. `clean` is false when it dropped rather than being closed by us. */
  onClose?: (clean: boolean) => void;
}

export interface StartOptions {
  language?: string;
  pageUrl?: string;
  echoCancellationUnavailable?: boolean;
}

export class VoiceConnection {
  private socket: WebSocket | undefined;
  private closing = false;
  private dropped = 0;
  /**
   * Control messages sent before the socket finished opening.
   *
   * A visitor who types a question and presses send is the reason this exists: the connection
   * is opened by that very action, so their first message is always written to a socket that is
   * still connecting. Dropping it means the widget appears to swallow the first thing anyone
   * says to it. Audio is not queued this way — a stale frame is worse than a missing one.
   */
  private pending: ClientToServerMessage[] = [];

  constructor(
    private readonly url: string,
    private readonly sessionToken: string,
    private readonly handlers: ConnectionHandlers,
  ) {}

  get isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /** Audio frames dropped because the connection could not keep up. Shown in diagnostics. */
  get droppedFrames(): number {
    return this.dropped;
  }

  connect(options: StartOptions = {}): void {
    const socket = new WebSocket(this.url);
    // Binary frames arrive as ArrayBuffer rather than Blob, which would need an async read on
    // every 20 ms of audio.
    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    socket.onopen = () => {
      // The handshake is the first thing on the wire; the server refuses anything else until
      // it has seen it.
      this.send({
        type: 'start',
        protocolVersion: VOICE_PROTOCOL_VERSION,
        sessionToken: this.sessionToken,
        ...options,
      });

      // After the handshake, never before it: the server refuses anything that arrives ahead
      // of `start`.
      const queued = this.pending;
      this.pending = [];
      for (const message of queued) this.send(message);

      this.handlers.onOpen?.();
    };

    socket.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
      if (typeof event.data === 'string') {
        // The server's own output, so a parse failure is a bug rather than an attack — but a
        // widget that throws here stops rendering the conversation entirely.
        try {
          this.handlers.onMessage(JSON.parse(event.data) as ServerToClientMessage);
        } catch {
          // Ignore a frame we cannot read.
        }
        return;
      }

      // A byte length that is not a whole number of samples means the frame is damaged;
      // reinterpreting it would play as a burst of noise.
      if (event.data.byteLength % 2 !== 0) return;
      this.handlers.onAudio(new Int16Array(event.data));
    };

    socket.onclose = () => {
      const wasClosing = this.closing;
      this.socket = undefined;
      this.closing = false;
      this.handlers.onClose?.(wasClosing);
    };

    // `onerror` carries no usable detail by design (it would leak cross-origin information).
    // `onclose` always follows it, so the close handler is the only one that needs to act.
    socket.onerror = () => undefined;
  }

  send(message: ClientToServerMessage): void {
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      // Bounded, because a socket that never opens must not accumulate a conversation.
      if (this.pending.length < 8) this.pending.push(message);
      return;
    }
    if (!this.isOpen) return;
    this.socket!.send(JSON.stringify(message));
  }

  sendAudio(frame: Int16Array): void {
    if (!this.isOpen) return;
    if (this.socket!.bufferedAmount > MAX_BUFFERED_BYTES) {
      this.dropped += 1;
      return;
    }
    // The view, not `frame.buffer` — a frame that is a slice of a larger buffer would otherwise
    // send the whole thing.
    this.socket!.send(frame);
  }

  /** Say goodbye properly, so the server ends the conversation rather than timing it out. */
  close(): void {
    if (this.socket === undefined) return;
    this.closing = true;
    this.send({ type: 'end' });
    this.socket.close(1000, 'client ended');
  }
}
