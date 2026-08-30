import { createHmac, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { getWidgetConfig } from '../../config.js';

export const WEB_AGENT_IDENTITY_SCOPE = 'web-agent:identity:mint';
export const WEB_AGENT_INSTALL_SCOPE = 'web-agent:installation:claim';
export const WEB_AGENT_INSTALL_GRANT_SCOPE = 'web-agent:installation:bootstrap';
export const WEB_AGENT_IDENTITY_TTL_SECONDS = 5 * 60;

interface IdentityClaims {
  organizationId: string;
  agentId: string;
  origin: string;
  externalUserId: string;
}

const signingKey = (secret?: string): Uint8Array =>
  new TextEncoder().encode(secret ?? getWidgetConfig().WIDGET_TOKEN_SECRET);

/** Stable and non-reversible. The merchant's raw user ID never enters a browser token or log. */
export function fingerprintExternalUser(claims: IdentityClaims, secret?: string): string {
  const key = secret ?? getWidgetConfig().WIDGET_TOKEN_SECRET;
  return createHmac('sha256', key)
    .update(`${claims.organizationId}:${claims.agentId}:${claims.externalUserId}`)
    .digest('base64url');
}

/** Minted only after a server API key has authenticated the merchant backend. */
export async function mintWebAgentIdentity(
  claims: IdentityClaims,
  options: { secret?: string; ttlSeconds?: number } = {},
): Promise<{ token: string; expiresIn: number; userFingerprint: string }> {
  const expiresIn = options.ttlSeconds ?? WEB_AGENT_IDENTITY_TTL_SECONDS;
  const userFingerprint = fingerprintExternalUser(claims, options.secret);
  const token = await new SignJWT({
    organizationId: claims.organizationId,
    agentId: claims.agentId,
    origin: claims.origin,
    userFingerprint,
    purpose: 'web-agent-user-identity',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('voomate-web-agent-identity')
    .setAudience('voomate-web-agent-sdk')
    .setSubject(claims.agentId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(signingKey(options.secret));

  return { token, expiresIn, userFingerprint };
}
