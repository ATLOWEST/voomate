import { flushRunEvents, logRunEvent, type RunContext } from '@/lib/web-agent/log';
import { publicWebAgentError } from '@/lib/web-agent/public-error';
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
  let imageCount = 0;
  try {
    const token = bearerToken(request);
    if (!token) throw new Error('Session token required.');
    const claims = await verifyWidgetSession(token, origin);
    await enforceWidgetRateLimit(`${claims.keyFingerprint}:${origin}`);
    const input = messageRequestSchema.parse(await request.json());
    imageCount = input.imageIds.length;
    const result = await runWebAgentTurn({
      claims,
      token,
      origin,
      input: { ...input, channel: 'text' },
      onStarted: (startedContext) => {
        context = startedContext;
      },
    });
    context = result.context;
    await flushRunEvents(context);

    return Response.json(
      {
        conversationId: result.conversationId,
        messageId: result.messageId,
        message: result.message,
        clientCommands: result.clientCommands,
        presentation: result.presentation,
      },
      { headers: { ...corsHeaders(origin), 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (context) {
      await logRunEvent(context, 'request', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => undefined);
      await flushRunEvents(context).catch(() => undefined);
    }
    const publicError = publicWebAgentError(error, imageCount);
    console.error('Web Agent message error', error);
    return Response.json(
      {
        error: publicError.message,
        code: publicError.code,
        ...(context?.conversationId ? { conversationId: context.conversationId } : {}),
      },
      {
        status: publicError.status,
        headers: corsHeaders(origin),
      },
    );
  }
}
