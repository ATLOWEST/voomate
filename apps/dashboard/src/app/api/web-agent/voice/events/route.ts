import { flushRunEvents, logRunEvent, type RunContext } from '@/lib/web-agent/log';
import { enforceWidgetRateLimit } from '@/lib/web-agent/rate-limit';
import {
  bearerToken,
  corsHeaders,
  normalizeOrigin,
  verifyWidgetSession,
  voiceEventRequestSchema,
} from '@/lib/web-agent/security';

export const runtime = 'nodejs';

export function OPTIONS(request: Request): Response {
  const origin = normalizeOrigin(request.headers.get('origin')) ?? 'null';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request): Promise<Response> {
  const origin = normalizeOrigin(request.headers.get('origin'));
  if (!origin) return Response.json({ error: 'Origin header required.' }, { status: 403 });
  try {
    const token = bearerToken(request);
    if (!token) throw new Error('Session token required.');
    const claims = await verifyWidgetSession(token, origin);
    await enforceWidgetRateLimit(`${claims.keyFingerprint}:${origin}:voice-events`);
    const input = voiceEventRequestSchema.parse(await request.json());
    const context: RunContext = {
      organizationId: claims.organizationId,
      agentId: claims.agentId,
      conversationId: input.conversationId,
      runId: input.runId,
      eventBuffer: [],
    };
    await logRunEvent(context, input.stage, input.status, input.metrics, input.latencyMs);
    await flushRunEvents(context);
    return Response.json({ ok: true }, { headers: corsHeaders(origin) });
  } catch {
    return Response.json(
      { error: 'Invalid voice event.' },
      { status: 400, headers: corsHeaders(origin) },
    );
  }
}
