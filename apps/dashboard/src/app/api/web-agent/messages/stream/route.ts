import { flushRunEvents, logRunEvent, type RunContext } from '@/lib/web-agent/log';
import { publicWebAgentError } from '@/lib/web-agent/public-error';
import { enforceWidgetRateLimit } from '@/lib/web-agent/rate-limit';
import {
  bearerToken,
  corsHeaders,
  normalizeOrigin,
  streamMessageRequestSchema,
  verifyWidgetSession,
} from '@/lib/web-agent/security';
import { runWebAgentTurn } from '@/lib/web-agent/turn';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request): Response {
  const origin = normalizeOrigin(request.headers.get('origin')) ?? 'null';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request): Promise<Response> {
  const origin = normalizeOrigin(request.headers.get('origin'));
  if (!origin) return Response.json({ error: 'Origin header required.' }, { status: 403 });
  const token = bearerToken(request);
  if (!token) return Response.json({ error: 'Session token required.' }, { status: 401 });

  let claims;
  let input;
  try {
    claims = await verifyWidgetSession(token, origin);
    input = streamMessageRequestSchema.parse(await request.json());
    if (input.channel === 'voice' && input.imageIds.length > 0) {
      throw new Error('Voice turns cannot contain image attachments.');
    }
    await enforceWidgetRateLimit(`${claims.keyFingerprint}:${origin}:${input.channel}`);
  } catch (error) {
    const rateLimited = error instanceof Error && error.message === 'RATE_LIMITED';
    return Response.json(
      { error: rateLimited ? 'Too many requests. Please try again shortly.' : 'Invalid request.' },
      { status: rateLimited ? 429 : 400, headers: corsHeaders(origin) },
    );
  }

  const encoder = new TextEncoder();
  let context: RunContext | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      void (async () => {
        try {
          const result = await runWebAgentTurn({
            claims,
            token,
            origin,
            input,
            onStarted: (startedContext) => {
              context = startedContext;
              send({
                type: 'start',
                conversationId: startedContext.conversationId,
                runId: startedContext.runId,
              });
            },
            onTextDelta: (text) => send({ type: 'delta', text }),
          });
          context = result.context;
          send({
            type: 'done',
            conversationId: result.conversationId,
            messageId: result.messageId,
            message: result.message,
            runId: result.context.runId,
            clientCommands: result.clientCommands,
          });
          await flushRunEvents(result.context);
        } catch (error) {
          if (context) {
            await logRunEvent(context, 'request', 'error', {
              error: error instanceof Error ? error.message : 'Unknown error',
            }).catch(() => undefined);
            await flushRunEvents(context).catch(() => undefined);
          }
          const publicError = publicWebAgentError(error, input.imageIds.length);
          send({
            type: 'error',
            error: publicError.message,
            code: publicError.code,
            ...(context?.conversationId ? { conversationId: context.conversationId } : {}),
          });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(origin),
      'Cache-Control': 'no-store, no-transform',
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
