/**
 * The iframe app.
 *
 * Runs on our own origin, isolated from the merchant's page. This is where session tokens
 * live and where the conversation happens; the merchant's page never sees either.
 *
 * This file is only the boundary: it validates what comes across postMessage, starts the
 * conversation, and reports back the few events a merchant might want for their own analytics.
 * Everything else is in `conversation.ts`.
 */
import {
  parseHostEnvelope,
  wrapFrameMessage,
  WIDGET_PROTOCOL_VERSION,
  type FrameToHostMessage,
  type HostToFrameMessage,
} from '@soniq/core/widget-protocol';
import { Conversation } from './conversation.js';
import './styles.css';

interface SessionState {
  embedKey?: string;
  pageUrl?: string;
  browserLanguage?: string;
  /** The exact origin that sent `init`. Every later message must match it. */
  hostOrigin?: string;
}

const state: SessionState = {};
let conversation: Conversation | undefined;

const send = (payload: FrameToHostMessage): void => {
  // Before `init` we do not yet know the host origin, so `ready` must go to '*'. This is
  // safe only because `ready` carries nothing sensitive — just a protocol version. Every
  // subsequent message is targeted at the specific origin that answered.
  const target = state.hostOrigin ?? '*';
  window.parent.postMessage(wrapFrameMessage(payload), target);
};

const start = (embedKey: string): void => {
  const root = document.getElementById('root');
  if (root === null || conversation !== undefined) return;

  conversation = new Conversation(
    root,
    {
      embedKey,
      ...(state.pageUrl !== undefined ? { pageUrl: state.pageUrl } : {}),
      // Only the language part of a locale: the browser says `en-GB`, the agent is configured
      // for `en-US`, and they are the same language for every purpose here.
      ...(state.browserLanguage !== undefined
        ? { language: state.browserLanguage.split('-')[0] }
        : {}),
    },
    {
      onStarted: (conversationId, channel) =>
        send({ type: 'conversation-started', conversationId, channel }),
      onEnded: (conversationId) => send({ type: 'conversation-ended', conversationId }),
      onMicDenied: () => send({ type: 'mic-permission-denied' }),
      onError: (code, message) => send({ type: 'error', code, message }),
    },
  );

  void conversation.load();
};

const handleHostMessage = (payload: HostToFrameMessage, origin: string): void => {
  switch (payload.type) {
    case 'init':
      // Pin the host origin on the first init and never accept a different one afterwards.
      // Without this, any other frame could send messages once we are listening.
      state.hostOrigin ??= origin;
      if (state.hostOrigin !== origin) return;

      state.embedKey = payload.embedKey;
      state.pageUrl = payload.pageUrl;
      state.browserLanguage = payload.browserLanguage;

      start(payload.embedKey);
      break;

    case 'open':
      if (origin !== state.hostOrigin) return;
      send({ type: 'opened' });
      break;

    case 'close':
      if (origin !== state.hostOrigin) return;
      // Closing the bubble ends the session. It is billed by the minute, and a visitor who
      // closed the widget is not in a conversation whatever the socket thinks.
      void conversation?.stop();
      send({ type: 'closed' });
      break;

    case 'navigate':
      if (origin !== state.hostOrigin) return;
      // Page context affects answers — "what does this cost?" depends on the page.
      state.pageUrl = payload.pageUrl;
      conversation?.setPageUrl(payload.pageUrl);
      break;

    default:
      break;
  }
};

window.addEventListener('message', (event: MessageEvent) => {
  const envelope = parseHostEnvelope(event.data);
  if (envelope === undefined) return;
  handleHostMessage(envelope.payload, event.origin);
});

// Best effort: a closing tab does not always give us time, but when it does the server ends the
// conversation immediately instead of waiting out the idle timeout with a Transcribe stream open.
window.addEventListener('pagehide', () => {
  void conversation?.stop();
});

send({ type: 'ready', protocolVersion: WIDGET_PROTOCOL_VERSION });
