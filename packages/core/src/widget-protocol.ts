/**
 * Widget ↔ host page postMessage protocol.
 *
 * The widget UI runs in a cross-origin iframe (see ADR 0003), so every interaction with the
 * merchant's page crosses an origin boundary. This module is the versioned contract for
 * that channel.
 *
 * Security rules, both directions, no exceptions:
 *   1. Verify `event.origin` against the expected origin before handling any message.
 *   2. Verify the `source` discriminator — other scripts on the page also post messages.
 *   3. Validate the payload shape. Never trust structure because the origin matched.
 *
 * The version is checked on connect: a merchant may have a cached loader from months ago
 * while the iframe is current, so the two halves must be able to detect a mismatch rather
 * than fail in confusing ways.
 */

export const WIDGET_PROTOCOL_VERSION = 1;

/** Discriminators — distinguishes our traffic from every other postMessage on the page. */
export const HOST_SOURCE = 'soniq-host' as const;
export const FRAME_SOURCE = 'soniq-frame' as const;

// --- Host page → iframe ------------------------------------------------------------------

export type HostToFrameMessage =
  /** Sent once when the iframe reports ready. Carries the config the loader was given. */
  | {
      type: 'init';
      embedKey: string;
      pageUrl: string;
      /** Browser language, a hint for language selection. */
      browserLanguage?: string;
      /** Merchant-supplied visitor context, e.g. { plan: 'pro' }. Untrusted. */
      metadata?: Record<string, string>;
    }
  | { type: 'open' }
  | { type: 'close' }
  /** Host page navigated (SPA route change) — page context affects answers. */
  | { type: 'navigate'; pageUrl: string }
  /** Host page theme changed and the widget is set to `auto`. */
  | { type: 'theme'; theme: 'light' | 'dark' };

// --- iframe → host page ------------------------------------------------------------------

export type FrameToHostMessage =
  /** First message. The loader replies with `init`. */
  | { type: 'ready'; protocolVersion: number }
  /** The iframe needs different outer dimensions — only the loader can resize the frame. */
  | { type: 'resize'; width: number; height: number }
  | { type: 'opened' }
  | { type: 'closed' }
  /** Surfaced so merchants can hook their own analytics. */
  | { type: 'conversation-started'; conversationId: string; channel: 'voice' | 'text' }
  | { type: 'conversation-ended'; conversationId: string }
  /**
   * Microphone permission was denied. The loader may want to show host-page guidance —
   * browsers render permission prompts confusingly for cross-origin iframes.
   */
  | { type: 'mic-permission-denied' }
  /** Fatal error. `message` is safe to display; internals are never sent across. */
  | { type: 'error'; code: string; message: string };

export interface HostEnvelope {
  source: typeof HOST_SOURCE;
  protocolVersion: number;
  payload: HostToFrameMessage;
}

export interface FrameEnvelope {
  source: typeof FRAME_SOURCE;
  protocolVersion: number;
  payload: FrameToHostMessage;
}

export const wrapHostMessage = (payload: HostToFrameMessage): HostEnvelope => ({
  source: HOST_SOURCE,
  protocolVersion: WIDGET_PROTOCOL_VERSION,
  payload,
});

export const wrapFrameMessage = (payload: FrameToHostMessage): FrameEnvelope => ({
  source: FRAME_SOURCE,
  protocolVersion: WIDGET_PROTOCOL_VERSION,
  payload,
});

const isEnvelope = (value: unknown): value is { source: unknown; payload: unknown } =>
  typeof value === 'object' && value !== null && 'source' in value && 'payload' in value;

/**
 * Narrow an untrusted `MessageEvent.data` to a host envelope.
 *
 * Deliberately does NOT check the origin — the caller must do that against its own expected
 * origin, which this module cannot know. Both checks are required.
 */
export const parseHostEnvelope = (data: unknown): HostEnvelope | undefined => {
  if (!isEnvelope(data) || data.source !== HOST_SOURCE) return undefined;
  const candidate = data as HostEnvelope;
  if (typeof candidate.payload?.type !== 'string') return undefined;
  return candidate;
};

export const parseFrameEnvelope = (data: unknown): FrameEnvelope | undefined => {
  if (!isEnvelope(data) || data.source !== FRAME_SOURCE) return undefined;
  const candidate = data as FrameEnvelope;
  if (typeof candidate.payload?.type !== 'string') return undefined;
  return candidate;
};
