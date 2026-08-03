/**
 * The iframe app.
 *
 * Runs on our own origin, isolated from the merchant's page. This is where session tokens
 * live, where the conversation happens, and where the Chime SDK is eventually lazy-loaded
 * for voice.
 *
 * Phase 0 scope: establish the postMessage bridge and prove the trust boundary works.
 * The conversation UI arrives with the text MVP (Phase 2) and voice in Phase 3.
 */
import {
  parseHostEnvelope,
  wrapFrameMessage,
  WIDGET_PROTOCOL_VERSION,
  type FrameToHostMessage,
  type HostToFrameMessage,
} from '@soniq/core/widget-protocol';

interface SessionState {
  embedKey?: string;
  pageUrl?: string;
  browserLanguage?: string;
  /** The exact origin that sent `init`. Every later message must match it. */
  hostOrigin?: string;
}

const state: SessionState = {};

const send = (payload: FrameToHostMessage): void => {
  // Before `init` we do not yet know the host origin, so `ready` must go to '*'. This is
  // safe only because `ready` carries nothing sensitive — just a protocol version. Every
  // subsequent message is targeted at the specific origin that answered.
  const target = state.hostOrigin ?? '*';
  window.parent.postMessage(wrapFrameMessage(payload), target);
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

      // TODO(phase-1): POST /v1/widget/session with the embed key to exchange it for a
      // scoped session token, then render the conversation UI.
      render();
      break;

    case 'open':
      if (origin !== state.hostOrigin) return;
      send({ type: 'opened' });
      break;

    case 'close':
      if (origin !== state.hostOrigin) return;
      send({ type: 'closed' });
      break;

    case 'navigate':
      if (origin !== state.hostOrigin) return;
      // Page context affects answers — "what does this cost?" depends on the page.
      state.pageUrl = payload.pageUrl;
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

const render = (): void => {
  const root = document.getElementById('root');
  if (root === null) return;
  root.textContent = 'Assistant ready.';
};

send({ type: 'ready', protocolVersion: WIDGET_PROTOCOL_VERSION });
