/**
 * Talking to our own API from the iframe.
 *
 * Two calls, both at the very start: exchange the public embed key for a session token, and
 * open the socket that token unlocks. The API origin is baked in at build time rather than
 * discovered at runtime, because it also has to appear in the iframe's `connect-src` CSP, and
 * a value the page could change would make that policy meaningless.
 */

/** Injected by `vite.app.config.ts`. Same value the CSP is built from. */
declare const __API_ORIGIN__: string;

export const API_ORIGIN: string = __API_ORIGIN__;

export interface AgentPresentation {
  displayName: string;
  greeting?: string;
  appearance: { accentColor?: string; avatarUrl?: string; theme?: string };
  voiceEnabled: boolean;
  languages: string[];
  primaryLanguage: string;
  codeSwitching: boolean;
}

export interface WidgetSession {
  agent: AgentPresentation;
  session: { channel: 'voice' | 'text'; token: string; expiresIn: number };
}

/**
 * Exchange the embed key for a session token.
 *
 * The embed key is public — it ships in the merchant's page HTML — so nothing here is secret.
 * What makes it safe is that the server checks the `Origin` header the browser sets, which page
 * JavaScript cannot forge, against the merchant's allowlist.
 */
export const createSession = async (
  embedKey: string,
  channel: 'voice' | 'text',
): Promise<WidgetSession> => {
  const response = await fetch(`${API_ORIGIN}/v1/widget/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ embedKey, channel }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      { error?: { message?: string } } | undefined;
    // The server writes these messages for visitors to read ("This assistant is not available
    // right now."), so they are shown as-is rather than replaced with something generic.
    throw new Error(body?.error?.message ?? 'The assistant could not be reached.');
  }

  return (await response.json()) as WidgetSession;
};

/** The voice socket URL: same origin as the API, ws or wss to match. */
export const voiceSocketUrl = (): string => `${API_ORIGIN.replace(/^http/, 'ws')}/v1/widget/voice`;
