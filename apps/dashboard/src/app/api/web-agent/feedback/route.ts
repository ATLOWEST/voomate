import { and, eq } from 'drizzle-orm';
import { conversations, messageFeedback, messages } from '@voomate/db';
import { getWebAgentDb } from '@/lib/web-agent/db';
import { loadWebAgentHarness } from '@/lib/web-agent/harness';
import { enforceWidgetRateLimit } from '@/lib/web-agent/rate-limit';
import {
  bearerToken,
  corsHeaders,
  messageFeedbackRequestSchema,
  normalizeOrigin,
  verifyWidgetSession,
  widgetVisitorFingerprint,
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
    const visitorFingerprint = widgetVisitorFingerprint(claims);
    await enforceWidgetRateLimit(`${claims.keyFingerprint}:${origin}:feedback`);
    const input = messageFeedbackRequestSchema.parse(await request.json());
    const db = getWebAgentDb();
    const [target] = await db
      .select({ id: messages.id })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(
        and(
          eq(messages.organizationId, claims.organizationId),
          eq(conversations.organizationId, claims.organizationId),
          eq(conversations.agentId, claims.agentId),
          eq(conversations.visitorId, visitorFingerprint),
          eq(messages.conversationId, input.conversationId),
          eq(messages.id, input.messageId),
          eq(messages.role, 'agent'),
        ),
      )
      .limit(1);
    if (!target) {
      return Response.json(
        { error: 'Assistant message not found.' },
        { status: 404, headers: corsHeaders(origin) },
      );
    }
    const harness = await loadWebAgentHarness({ businessName: 'tenant', agentName: 'agent' });
    await db
      .insert(messageFeedback)
      .values({
        organizationId: claims.organizationId,
        agentId: claims.agentId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        sessionFingerprint: visitorFingerprint,
        rating: input.rating,
        reason: input.reason,
        policyVersion: harness.version,
      })
      .onConflictDoUpdate({
        target: [messageFeedback.messageId, messageFeedback.sessionFingerprint],
        set: { rating: input.rating, reason: input.reason, updatedAt: new Date() },
      });
    return Response.json(
      { ok: true },
      { headers: { ...corsHeaders(origin), 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'Feedback could not be saved.' },
      { status: 400, headers: corsHeaders(origin) },
    );
  }
}
