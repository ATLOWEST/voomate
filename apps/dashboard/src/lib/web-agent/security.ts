import { createHash } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';

const SESSION_TTL_SECONDS = 15 * 60;

export const sessionRequestSchema = z.object({
  publicKey: z.string().min(12).max(160),
});

export const messageRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  conversationId: z.string().uuid().optional(),
  pageUrl: z.string().url().max(2_048).optional(),
  imageIds: z.array(z.string().uuid()).max(2).default([]),
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
    })
    .parse(payload);
  if (claims.origin !== origin) throw new Error('Widget token origin mismatch.');
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
