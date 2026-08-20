import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { agents, conversations, messages } from '@voomate/db';
import { getWebAgentDb } from '@/lib/web-agent/db';
import { flushRunEvents, logRunEvent } from '@/lib/web-agent/log';
import { enforceWidgetRateLimit } from '@/lib/web-agent/rate-limit';
import {
  corsHeaders,
  keyFingerprint,
  mintWidgetContinuation,
  mintWidgetSession,
  normalizeOrigin,
  sessionRequestSchema,
  sessionFingerprint,
  verifyWidgetContinuation,
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
    const input = sessionRequestSchema.parse(await request.json());
    const fingerprint = keyFingerprint(input.publicKey);
    await enforceWidgetRateLimit(`${fingerprint}:${origin}`);

    // This is the one pre-tenant lookup: the public key resolves the tenant. No tenant table
    // is queried again without the resolved organization ID in its predicate.
    const [agent] = await getWebAgentDb()
      .select({
        id: agents.id,
        organizationId: agents.organizationId,
        status: agents.status,
        allowedOrigins: agents.allowedOrigins,
        persona: agents.persona,
        appearance: agents.appearance,
        voiceEnabled: agents.voiceEnabled,
        desiredStateRevision: agents.desiredStateRevision,
        executionLeaseId: agents.executionLeaseId,
        executionLeaseExpiresAt: agents.executionLeaseExpiresAt,
      })
      .from(agents)
      .where(eq(agents.embedKey, input.publicKey))
      .limit(1);

    const allowedOrigins = (agent?.allowedOrigins ?? [])
      .map((value) => normalizeOrigin(value))
      .filter((value): value is string => Boolean(value));
    if (
      !agent ||
      agent.status !== 'active' ||
      !agent.executionLeaseId ||
      !allowedOrigins.includes(origin)
    ) {
      console.warn(
        JSON.stringify({ event: 'widget_session_denied', origin, keyFingerprint: fingerprint }),
      );
      return Response.json(
        { error: 'This assistant is not authorized for this website.' },
        { status: 403, headers: corsHeaders(origin) },
      );
    }

    if (
      !agent.executionLeaseExpiresAt ||
      agent.executionLeaseExpiresAt.getTime() < Date.now() + 5 * 60 * 1_000
    ) {
      const leaseExpiresAt = new Date(Date.now() + 20 * 60 * 1_000);
      await getWebAgentDb()
        .update(agents)
        .set({ executionLeaseExpiresAt: leaseExpiresAt, updatedAt: new Date() })
        .where(
          and(
            eq(agents.organizationId, agent.organizationId),
            eq(agents.id, agent.id),
            eq(agents.status, 'active'),
            eq(agents.executionLeaseId, agent.executionLeaseId),
            eq(agents.desiredStateRevision, agent.desiredStateRevision),
          ),
        );
    }

    let visitorSessionId: string = randomUUID();
    let continuationAccepted = false;
    if (input.continuationToken) {
      const previous = await verifyWidgetContinuation(input.continuationToken, origin);
      if (
        previous.agentId !== agent.id ||
        previous.organizationId !== agent.organizationId ||
        previous.keyFingerprint !== fingerprint
      ) {
        throw new Error('Widget continuation does not match this agent.');
      }
      visitorSessionId = previous.visitorSessionId;
      continuationAccepted = true;
    }

    const runId = randomUUID();
    const context = {
      organizationId: agent.organizationId,
      agentId: agent.id,
      runId,
      eventBuffer: [],
    };
    await logRunEvent(context, 'tenant_resolution', 'success', {
      origin,
      keyFingerprint: fingerprint,
    });
    const claims = {
      organizationId: agent.organizationId,
      agentId: agent.id,
      origin,
      keyFingerprint: fingerprint,
      visitorSessionId,
      configurationRevision: agent.desiredStateRevision,
      executionLeaseId: agent.executionLeaseId,
    };
    const [session, continuation] = await Promise.all([
      mintWidgetSession(claims),
      mintWidgetContinuation(claims),
    ]);
    const resumedConversation =
      continuationAccepted && input.conversationId
        ? await getWebAgentDb()
            .select({ role: messages.role, content: messages.content })
            .from(conversations)
            .innerJoin(messages, eq(messages.conversationId, conversations.id))
            .where(
              and(
                eq(conversations.id, input.conversationId),
                eq(conversations.organizationId, agent.organizationId),
                eq(conversations.agentId, agent.id),
                eq(conversations.visitorId, sessionFingerprint(visitorSessionId)),
                eq(messages.organizationId, agent.organizationId),
              ),
            )
            .orderBy(desc(messages.createdAt))
            .limit(50)
        : [];
    await logRunEvent(context, 'session_token', 'success', {
      expiresIn: session.expiresIn,
      continuationAccepted,
      resumedMessageCount: resumedConversation.length,
    });
    await flushRunEvents(context);

    const persona = agent.persona as { displayName?: string; greeting?: string };
    const voiceServiceOrigin = (
      process.env.VOICE_SERVICE_ORIGIN ??
      (process.env.NODE_ENV === 'development' ? 'http://localhost:7860' : undefined)
    )?.replace(/\/$/, '');
    return Response.json(
      {
        session: {
          ...session,
          continuationToken: continuation.token,
          continuationExpiresIn: continuation.expiresIn,
        },
        resumedConversation:
          continuationAccepted && input.conversationId && resumedConversation.length
            ? {
                conversationId: input.conversationId,
                messages: resumedConversation.reverse(),
              }
            : null,
        agent: {
          displayName: persona.displayName ?? 'Assistant',
          greeting: persona.greeting ?? 'Hi! How can I help?',
          voiceEnabled: agent.voiceEnabled,
          voice:
            agent.voiceEnabled && voiceServiceOrigin
              ? { transport: 'webrtc', startUrl: `${voiceServiceOrigin}/start` }
              : null,
          appearance: agent.appearance,
        },
      },
      { status: 201, headers: { ...corsHeaders(origin), 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const rateLimited = error instanceof Error && error.message === 'RATE_LIMITED';
    console.error('Web Agent session error', error);
    return Response.json(
      { error: rateLimited ? 'Too many requests. Please try again shortly.' : 'Invalid request.' },
      { status: rateLimited ? 429 : 400, headers: corsHeaders(origin) },
    );
  }
}
