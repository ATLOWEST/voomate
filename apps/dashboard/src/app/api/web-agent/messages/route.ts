import { ImageUploadError } from '@/lib/web-agent/images';
import { flushRunEvents, logRunEvent, type RunContext } from '@/lib/web-agent/log';
import { enforceWidgetRateLimit } from '@/lib/web-agent/rate-limit';
import {
  bearerToken,
  corsHeaders,
  messageRequestSchema,
  normalizeOrigin,
  verifyWidgetSession,
} from '@/lib/web-agent/security';
import { runWebAgentTurn } from '@/lib/web-agent/turn';

export const runtime = 'nodejs';

export function OPTIONS(request: Request): Response {
  const origin = normalizeOrigin(request.headers.get('origin')) ?? 'null';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request): Promise<Response> {
  const origin = normalizeOrigin(request.headers.get('origin'));
  if (!origin) return Response.json({ error: 'Origin header required.' }, { status: 403 });

  let context: RunContext | undefined;
  try {
    const token = bearerToken(request);
    if (!token) throw new Error('Session token required.');
    const claims = await verifyWidgetSession(token, origin);
    await enforceWidgetRateLimit(`${claims.keyFingerprint}:${origin}`);
    const input = messageRequestSchema.parse(await request.json());
    const result = await runWebAgentTurn({
      claims,
      token,
      origin,
      input: { ...input, channel: 'text' },
    });
    context = result.context;
    await flushRunEvents(context);

    return Response.json(
      { conversationId: result.conversationId, message: result.message },
      { headers: { ...corsHeaders(origin), 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (context) {
      await logRunEvent(context, 'request', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => undefined);
      await flushRunEvents(context).catch(() => undefined);
    }
    const rateLimited = error instanceof Error && error.message === 'RATE_LIMITED';
    const invalidImage = error instanceof ImageUploadError;
    const bedrockThrottled =
      error instanceof Error &&
      (error.name === 'ThrottlingException' || /too many requests|throttl/i.test(error.message));
    console.error('Web Agent message error', error);
    return Response.json(
      {
        error: rateLimited
          ? 'Too many requests. Please try again shortly.'
          : invalidImage
            ? error.message
            : bedrockThrottled
              ? 'Image analysis is temporarily busy. To prevent duplicate billing, attach the images again in a minute.'
              : 'The assistant could not complete that request.',
      },
      {
        status: rateLimited ? 429 : invalidImage ? error.status : bedrockThrottled ? 503 : 400,
        headers: corsHeaders(origin),
      },
    );
  }
}
