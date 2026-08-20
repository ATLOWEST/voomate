/**
 * Widget session tokens.
 *
 * The embed key is public — it ships in the merchant's page HTML, and anyone can read it. It
 * is not a credential. What makes it safe is that it can only be exchanged for one of these:
 * short-lived, signed, and bound to the origin that asked for it.
 *
 * The binding is the point. A voice session costs real money per minute, so a token lifted
 * from someone's page must not work from a script somewhere else. Every token carries the
 * origin it was minted for, and every use re-checks it against the `Origin` header of the
 * request presenting it. Stealing the token is not enough; the thief would have to make the
 * browser lie about which site they are on, which is the one thing it will not do.
 *
 * HS256, not RS256: there is exactly one service minting and verifying these, so an asymmetric
 * key pair buys nothing and costs a key-distribution problem.
 */
import { AppError, ErrorCode, type AgentId, type OrganizationId } from '@voomate/core';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getWidgetConfig } from '../../config.js';

const ISSUER = 'voomate';
const AUDIENCE = 'voomate-widget';

export interface WidgetSessionClaims {
  agentId: AgentId;
  organizationId: OrganizationId;
  /** Normalised origin this token is valid from. */
  origin: string;
  channel: 'voice' | 'text';
  configurationRevision: number;
  executionLeaseId: string;
}

/** Overrides exist so tests can run without a configured environment. */
export interface TokenOptions {
  secret?: string;
  ttlSeconds?: number;
}

const keyFor = (secret?: string): Uint8Array =>
  new TextEncoder().encode(secret ?? getWidgetConfig().WIDGET_TOKEN_SECRET);

export const mintWidgetToken = async (
  claims: WidgetSessionClaims,
  options: TokenOptions = {},
): Promise<{ token: string; expiresIn: number }> => {
  const ttl = options.ttlSeconds ?? getWidgetConfig().WIDGET_TOKEN_TTL_SECONDS;

  const token = await new SignJWT({
    org: claims.organizationId,
    origin: claims.origin,
    channel: claims.channel,
    rev: claims.configurationRevision,
    lease: claims.executionLeaseId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.agentId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(keyFor(options.secret));

  return { token, expiresIn: ttl };
};

const isChannel = (value: unknown): value is 'voice' | 'text' =>
  value === 'voice' || value === 'text';

/**
 * Verify a token and confirm it is being used from the origin it was minted for.
 *
 * Throws `AppError` rather than returning a result — every caller's response to a bad token is
 * the same (refuse the connection), and a checked return value is easy to forget to check.
 */
export const verifyWidgetToken = async (
  token: string,
  context: { origin: string | undefined },
  options: TokenOptions = {},
): Promise<WidgetSessionClaims> => {
  const reject = (reason: string): never => {
    throw new AppError(ErrorCode.INVALID_TOKEN, 'This session is not valid.', {
      context: { reason },
    });
  };

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, keyFor(options.secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    }));
  } catch (error) {
    // Expiry, tampering and a wrong secret all land here and all get the same answer. Telling
    // the caller which one it was tells an attacker which one to fix.
    return reject(error instanceof Error ? error.name : 'invalid');
  }

  const { sub, org, origin, channel, rev, lease } = payload as JWTPayload & Record<string, unknown>;

  if (
    typeof sub !== 'string' ||
    typeof org !== 'string' ||
    typeof origin !== 'string' ||
    typeof rev !== 'number' ||
    !Number.isInteger(rev) ||
    rev < 1 ||
    typeof lease !== 'string'
  ) {
    return reject('malformed');
  }
  if (!isChannel(channel)) return reject('malformed');

  // The check the whole design rests on.
  if (context.origin === undefined || context.origin !== origin) return reject('origin-mismatch');

  return {
    agentId: sub as AgentId,
    organizationId: org as OrganizationId,
    origin,
    channel,
    configurationRevision: rev,
    executionLeaseId: lease,
  };
};
