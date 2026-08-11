/**
 * The voice socket — where a browser's microphone meets the session orchestrator.
 *
 * This file is deliberately thin. Everything hard about voice (turn-taking, barge-in, echo,
 * latency) lives in `lib/voice/session.ts`, which knows nothing about WebSockets; this is the
 * adapter between that and one particular transport. If a later phase moves audio to WebRTC,
 * this file is what gets replaced, and nothing else does (ADR 0006).
 *
 * ## What it is responsible for
 *
 * **Deciding whether the socket may exist at all.** A voice session costs real money per
 * minute of Bedrock, Transcribe and Polly. The public embed key is not enough — the client
 * must present a session token bound to the origin it is connecting from.
 *
 * **Framing.** Binary frames are PCM audio and go to the session's ear. Text frames are JSON
 * control messages. Nothing else is accepted.
 *
 * **Not leaking sessions.** A connection that opens and goes quiet, a browser that closes a
 * laptop lid, a network that vanishes without a FIN — each of these leaves a session holding an
 * open Transcribe stream that bills by the second. Every one of them is closed here.
 */
import {
  AgentStatus,
  VOICE_FRAME_SAMPLES,
  parseClientMessage,
  VOICE_PROTOCOL_VERSION,
  type AgentLanguageConfig,
  type AgentPersona,
} from '@voomate/core';
import { agents } from '@voomate/db';
import { buildTranscribeConfig, type SttLanguageCode } from '@voomate/i18n';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { answerQuestion } from '../../lib/answer.js';
import { getDb } from '../../lib/db.js';
import { normalizeOrigin } from '../../lib/keys.js';
import { lockVoice, Synthesizer } from '../../lib/voice/polly.js';
import { VoiceSession, type AudioTransport } from '../../lib/voice/session.js';
import { TranscriptionStream } from '../../lib/voice/transcribe.js';
import { verifyWidgetToken } from './token.js';

/**
 * How long a socket may stay open without saying who it is.
 *
 * Connecting is free; a connection slot is not. Ten seconds is generous for a `start` message
 * that the client sends immediately on open.
 */
const HANDSHAKE_TIMEOUT_MS = 10_000;

/**
 * How long a session may run in total.
 *
 * Not a usage limit — a runaway guard. Nothing good happens in the fortieth minute of an
 * unattended voice session, and the cost is linear in time.
 */
const MAX_SESSION_MS = 30 * 60 * 1000;

/** Silence from the client for this long means the browser is gone, whatever TCP thinks. */
const IDLE_TIMEOUT_MS = 60_000;

/**
 * Outbound audio allowed to sit unsent before the connection is judged unusable.
 *
 * Audio is produced at a fixed rate; if the socket cannot drain it, the visitor is already
 * hearing a broken conversation. About four seconds of PCM. Closing is kinder than letting the
 * buffer grow until the process runs out of memory.
 */
const MAX_BUFFERED_BYTES = 4 * 16_000 * 2;

/** WebSocket close codes. 1011 is "internal error", 1008 "policy violation". */
const CLOSE = { normal: 1000, policy: 1008, internal: 1011 } as const;

const originOf = (request: FastifyRequest): string | undefined => {
  const origin = request.headers.origin;
  if (typeof origin === 'string' && origin !== 'null') return normalizeOrigin(origin);
  return undefined;
};

/**
 * Reinterpret a received frame as 16-bit samples.
 *
 * Copies rather than viewing the received buffer. Node pools small Buffer allocations, so a
 * view can be silently overwritten by the next frame while the session still holds it — a bug
 * that presents as intermittent audio corruption under load and nowhere else.
 */
const toSamples = (data: Buffer): Int16Array | undefined => {
  if (data.length === 0 || data.length % 2 !== 0) return undefined;
  const samples = new Int16Array(data.length / 2);
  for (let i = 0; i < samples.length; i += 1) samples[i] = data.readInt16LE(i * 2);
  return samples;
};

export const voiceSocketRoutes: FastifyPluginAsync = async (app) => {
  app.get('/voice', { websocket: true }, (socket: WebSocket, request) => {
    const log = request.log.child({ scope: 'voice-socket' });
    const origin = originOf(request);

    let session: VoiceSession | undefined;
    let transcription: TranscriptionStream | undefined;
    let closing = false;
    let lastMessageAt = Date.now();

    const timers: NodeJS.Timeout[] = [];
    const every = (ms: number, fn: () => void): void => {
      const timer = setInterval(fn, ms);
      timer.unref();
      timers.push(timer);
    };

    /** One way out, so no path can leave a Transcribe stream or a timer behind. */
    const shutdown = (reason: string, code: number = CLOSE.normal): void => {
      if (closing) return;
      closing = true;

      for (const timer of timers) clearInterval(timer);
      clearTimeout(handshakeTimer);

      // Closing the session stops transcription and sends `ended`; if it never started, the
      // stream may still be open on its own.
      void session?.close(reason);
      if (session === undefined) transcription?.stop();

      if (socket.readyState === socket.OPEN) socket.close(code, reason);
    };

    const handshakeTimer = setTimeout(() => {
      if (session === undefined) shutdown('handshake-timeout', CLOSE.policy);
    }, HANDSHAKE_TIMEOUT_MS);
    handshakeTimer.unref();

    const fail = (code: string, message: string): void => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'error', code, message, fatal: true }));
      }
      shutdown(code, CLOSE.policy);
    };

    // --- The handshake ---------------------------------------------------------------------

    const open = async (
      message: Extract<ReturnType<typeof parseClientMessage>, { type: 'start' }>,
    ) => {
      if (session !== undefined) return; // A second `start` is a client bug; ignore it.

      if (message.protocolVersion !== VOICE_PROTOCOL_VERSION) {
        fail('protocol_version', 'This widget is out of date. Please reload the page.');
        return;
      }

      const claims = await verifyWidgetToken(message.sessionToken, { origin });
      if (claims.channel !== 'voice') {
        fail('wrong_channel', 'This session is not a voice session.');
        return;
      }

      const db = getDb();
      const [agent] = await db.select().from(agents).where(eq(agents.id, claims.agentId)).limit(1);

      // The token proves who asked; the database decides whether they still may. A token minted
      // fifteen minutes ago outlives unpublishing an agent or turning voice off.
      if (agent === undefined || agent.organizationId !== claims.organizationId) {
        fail('not_found', 'This assistant is not available.');
        return;
      }
      if (agent.status !== AgentStatus.PUBLISHED || !agent.voiceEnabled) {
        fail('unavailable', 'This assistant is not available right now.');
        return;
      }

      const language = agent.language as AgentLanguageConfig;
      const persona = agent.persona as AgentPersona;

      // Fails loudly when no configured language has a voice — better than opening a session
      // that would be silent. The widget falls back to text on this error.
      const voice = lockVoice(language.languages, language.primaryLanguage, {
        ...(language.voiceOverrides?.[language.primaryLanguage] !== undefined
          ? { preferredVoiceId: language.voiceOverrides[language.primaryLanguage]! }
          : {}),
        ...(language.voiceTier !== undefined ? { ceiling: language.voiceTier } : {}),
      });

      const synthesizer = new Synthesizer({ voice, phraseLanguage: voice.languageCode });

      const transport: AudioTransport = {
        send: (pcm) => {
          if (socket.readyState !== socket.OPEN) return;
          if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {
            log.warn({ buffered: socket.bufferedAmount }, 'Voice socket cannot keep up');
            shutdown('slow-client', CLOSE.policy);
            return;
          }
          socket.send(pcm, { binary: true });
        },
        control: (payload) => {
          if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
        },
        close: (reason) => shutdown(reason),
      };

      transcription = new TranscriptionStream(
        {
          config: buildTranscribeConfig(
            language.languages,
            message.language !== undefined &&
              language.languages.includes(message.language as SttLanguageCode)
              ? (message.language as SttLanguageCode)
              : language.primaryLanguage,
            language.codeSwitching,
          ),
        },
        {
          onResult: (result) => session?.pushTranscript(result),
          onError: (error) => {
            log.error({ err: error }, 'Transcription failed');
            // Recoverable drops never reach here, so this one is terminal for listening. The
            // socket stays open: the visitor can still type, which is better than being cut off.
            transport.control({
              type: 'error',
              code: 'transcription_failed',
              message: 'The microphone connection was lost. You can still type.',
              fatal: false,
            });
          },
        },
      );

      session = new VoiceSession(
        {
          conversationId: randomUUID(),
          languages: language.languages,
          defaultLanguage: language.primaryLanguage,
          ...(persona.greeting !== undefined && persona.greeting.length > 0
            ? { greeting: persona.greeting }
            : {}),
          ...(message.echoCancellationUnavailable === true
            ? { turnConfig: { echoCancellationUnavailable: true } }
            : {}),
        },
        {
          transport,
          synthesizer,
          transcription,
          answer: answerQuestion,
          answerContext: {
            db,
            organizationId: claims.organizationId,
            agentId: claims.agentId,
            persona,
            ...(message.pageUrl !== undefined ? { pageUrl: message.pageUrl } : {}),
          },
          log: (event) => log.info(event),
        },
      );

      await session.start(synthesizer.lockedVoice);
      // Only after the greeting is under way — this competes with nothing at that point.
      void synthesizer.prewarm();
    };

    // --- Frames ----------------------------------------------------------------------------

    socket.on('message', (raw: Buffer, isBinary: boolean) => {
      lastMessageAt = Date.now();
      if (closing) return;

      if (isBinary) {
        if (session === undefined) return; // Audio before the handshake is discarded.
        const samples = toSamples(raw);
        // A frame that is not whole samples is a client bug, not an attack. Dropping one frame
        // is 20 ms of audio; closing the socket over it would be a worse outcome.
        if (samples !== undefined && samples.length <= VOICE_FRAME_SAMPLES * 50) {
          session.pushAudio(samples);
        }
        return;
      }

      const message = parseClientMessage(raw.toString('utf8'));
      if (message === undefined) return;

      if (message.type === 'start') {
        void open(message).catch((error: unknown) => {
          // Includes a rejected token. The visitor gets one message either way; the reason is
          // in the log, not on the wire.
          log.info({ err: error, origin }, 'Voice session refused');
          fail('session_refused', 'This session could not be started.');
        });
        return;
      }

      session?.handleMessage(message);
    });

    socket.on('close', () => shutdown('client-closed'));
    socket.on('error', (error) => {
      log.info({ err: error }, 'Voice socket error');
      shutdown('socket-error', CLOSE.internal);
    });

    // --- Liveness --------------------------------------------------------------------------

    // A closed laptop lid or a dropped mobile connection produces no close frame at all. Without
    // this, the session and its Transcribe stream would sit there billing until the process
    // restarted.
    every(15_000, () => {
      if (Date.now() - lastMessageAt > IDLE_TIMEOUT_MS) {
        shutdown('idle-timeout');
        return;
      }
      if (socket.readyState === socket.OPEN) socket.ping();
    });

    const sessionDeadline = setTimeout(() => shutdown('max-duration'), MAX_SESSION_MS);
    sessionDeadline.unref();
    socket.on('close', () => clearTimeout(sessionDeadline));
  });
};
