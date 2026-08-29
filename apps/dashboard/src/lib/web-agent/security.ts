import { createHash } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { pageContextSchema } from './page-context';

const SESSION_TTL_SECONDS = 15 * 60;
const CONTINUATION_TTL_SECONDS = 24 * 60 * 60;

export const sessionRequestSchema = z.object({
  publicKey: z.string().min(12).max(160),
  /** Five-minute token minted by the merchant's server. Never a long-lived browser API key. */
  identityToken: z.string().min(80).max(4_096).optional(),
  continuationToken: z.string().min(80).max(4_096).optional(),
  conversationId: z.string().uuid().optional(),
  // The server compares this URL with the browser Origin header before consulting the surface
  // policy. It therefore narrows an already approved origin; it can never widen one.
  pageUrl: z.string().url().max(2_048),
  // Browser-observed navigation is an advisory inventory only. It cannot grant access: the
  // origin + route policy gate below remains the source of truth for every session.
  routeInventory: z
    .object({
      version: z.literal(1),
      routes: z
        .array(
          z.object({
            pathname: z.string().min(1).max(240),
            name: z.string().trim().min(1).max(120).optional(),
            source: z.enum(['manifest', 'navigation', 'current']),
          }),
        )
        .max(240),
    })
    .optional(),
});

export const messageRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  conversationId: z.string().uuid().optional(),
  pageUrl: z.string().url().max(2_048).optional(),
  pageContext: pageContextSchema.optional(),
  imageIds: z.array(z.string().uuid()).max(2).default([]),
});

export const messageFeedbackRequestSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  rating: z.enum(['helpful', 'unhelpful']),
  reason: z.string().trim().max(500).optional(),
});

export const voiceMessageRequestSchema = messageRequestSchema.extend({
  imageIds: z.array(z.string().uuid()).max(0).default([]),
});

export const streamMessageRequestSchema = messageRequestSchema.extend({
  // Older Pipecat clients omit this field, so voice remains the compatibility default.
  channel: z.enum(['text', 'voice']).default('voice'),
});

export const voiceEventRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  runId: z.string().uuid(),
  stage: z.enum([
    'voice_connected',
    'transcribe_partial',
    'transcribe_final',
    'transcribe_discarded',
    'llm_first_text',
    'tts_first_audio',
    'voice_interrupted',
    'voice_turn_complete',
    'voice_disconnected',
  ]),
  status: z.enum(['started', 'success', 'error']).default('success'),
  latencyMs: z.number().int().min(0).max(300_000).optional(),
  // Deliberately numeric/boolean only: transcripts, audio, tokens and credentials can never be
  // smuggled into observability metadata from the public voice edge.
  metrics: z.record(z.union([z.number().finite(), z.boolean()])).default({}),
});

export const imageSignRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(240),
        size: z.number().int().positive(),
        type: z.string().trim().min(1).max(100),
      }),
    )
    .min(1)
    .max(2),
});

export const imageFinalizeRequestSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1).max(2),
});

export interface WidgetClaims {
  agentId: string;
  organizationId: string;
  origin: string;
  keyFingerprint: string;
  /** Stable opaque browser session ID. It contains no identity or tenant information. */
  visitorSessionId: string;
  /** Stable non-reversible ID present only after merchant-server identity verification. */
  verifiedUserId?: string;
  /** Monotonic configuration revision and lease bind this token to current desired state. */
  configurationRevision: number;
  executionLeaseId: string;
}

function tokenSecret(): Uint8Array {
  const value = process.env.WIDGET_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new Error('WIDGET_TOKEN_SECRET must contain at least 32 characters.');
  }
  return new TextEncoder().encode(value);
}

export function normalizeOrigin(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) {
      return undefined;
    }
    return url.origin.toLowerCase();
  } catch {
    return undefined;
  }
}

export function keyFingerprint(publicKey: string): string {
  return createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
}

export function sessionFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

export function widgetVisitorFingerprint(claims: WidgetClaims): string {
  return claims.verifiedUserId ?? sessionFingerprint(claims.visitorSessionId);
}

export async function verifyWebAgentIdentity(
  token: string,
  expected: { organizationId: string; agentId: string; origin: string },
): Promise<{ userFingerprint: string }> {
  const { payload } = await jwtVerify(token, tokenSecret(), {
    issuer: 'voomate-web-agent-identity',
    audience: 'voomate-web-agent-sdk',
    algorithms: ['HS256'],
  });
  const claims = z
    .object({
      sub: z.string().uuid(),
      organizationId: z.string().uuid(),
      agentId: z.string().uuid(),
      origin: z.string(),
      userFingerprint: z.string().length(43),
      purpose: z.literal('web-agent-user-identity'),
    })
    .parse(payload);
  if (
    claims.sub !== expected.agentId ||
    claims.agentId !== expected.agentId ||
    claims.organizationId !== expected.organizationId ||
    claims.origin !== expected.origin
  ) {
    throw new Error('Web Agent identity token does not match this session.');
  }
  return { userFingerprint: claims.userFingerprint };
}

export async function mintWidgetSession(claims: WidgetClaims): Promise<{
  token: string;
  expiresIn: number;
}> {
  const token = await new SignJWT({ ...claims, channel: 'web' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('voomate-web-agent')
    .setAudience('voomate-widget')
    .setSubject(claims.agentId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(tokenSecret());
  return { token, expiresIn: SESSION_TTL_SECONDS };
}

export async function mintWidgetContinuation(claims: WidgetClaims): Promise<{
  token: string;
  expiresIn: number;
}> {
  const token = await new SignJWT({ ...claims, purpose: 'conversation-continuation' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('voomate-web-agent')
    .setAudience('voomate-widget-continuation')
    .setSubject(claims.agentId)
    .setIssuedAt()
    .setExpirationTime(`${CONTINUATION_TTL_SECONDS}s`)
    .sign(tokenSecret());
  return { token, expiresIn: CONTINUATION_TTL_SECONDS };
}

export async function verifyWidgetSession(token: string, origin: string): Promise<WidgetClaims> {
  const { payload } = await jwtVerify(token, tokenSecret(), {
    issuer: 'voomate-web-agent',
    audience: 'voomate-widget',
  });
  const claims = z
    .object({
      agentId: z.string().uuid(),
      organizationId: z.string().uuid(),
      origin: z.string(),
      keyFingerprint: z.string().length(16),
      visitorSessionId: z.string().uuid(),
      verifiedUserId: z.string().length(43).optional(),
      configurationRevision: z.number().int().positive(),
      executionLeaseId: z.string().uuid(),
    })
    .parse(payload);
  if (claims.origin !== origin) throw new Error('Widget token origin mismatch.');
  return claims;
}

export async function verifyWidgetContinuation(
  token: string,
  origin: string,
): Promise<WidgetClaims> {
  const { payload } = await jwtVerify(token, tokenSecret(), {
    issuer: 'voomate-web-agent',
    audience: 'voomate-widget-continuation',
  });
  const claims = z
    .object({
      agentId: z.string().uuid(),
      organizationId: z.string().uuid(),
      origin: z.string(),
      keyFingerprint: z.string().length(16),
      visitorSessionId: z.string().uuid(),
      verifiedUserId: z.string().length(43).optional(),
      configurationRevision: z.number().int().positive(),
      executionLeaseId: z.string().uuid(),
      purpose: z.literal('conversation-continuation'),
    })
    .parse(payload);
  if (claims.origin !== origin) throw new Error('Widget continuation origin mismatch.');
  return claims;
}

export function bearerToken(request: Request): string | undefined {
  const value = request.headers.get('authorization');
  return value?.startsWith('Bearer ') ? value.slice(7) : undefined;
}

export function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}
