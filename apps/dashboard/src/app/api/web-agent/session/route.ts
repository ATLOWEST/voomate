import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { agents, auditLogs, conversations, messages } from '@voomate/db';
import { webDeploymentPolicyFromAppearance, webSurfaceForLocation } from '@voomate/core';
import { getWebAgentDb } from '@/lib/web-agent/db';
import { flushRunEvents, logRunEvent } from '@/lib/web-agent/log';
import { enforceWidgetRateLimit } from '@/lib/web-agent/rate-limit';
import { publicRequestOrigin } from '@/lib/web-agent/public-request-origin';
import {
  corsHeaders,
  keyFingerprint,
  mintWidgetContinuation,
  mintWidgetSession,
  normalizeOrigin,
  sessionRequestSchema,
  verifyWebAgentIdentity,
  verifyWidgetContinuation,
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
    const input = sessionRequestSchema.parse(await request.json());
    const pageUrl = new URL(input.pageUrl);
    if (normalizeOrigin(pageUrl.origin) !== origin) {
      return Response.json(
        { error: 'The page location does not match this website.' },
        { status: 403, headers: corsHeaders(origin) },
      );
    }
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
    if (!agent || !allowedOrigins.includes(origin)) {
      console.warn(
        JSON.stringify({ event: 'widget_session_denied', origin, keyFingerprint: fingerprint }),
      );
      return Response.json(
        { error: 'This assistant is not authorized for this website.' },
        { status: 403, headers: corsHeaders(origin) },
      );
    }

    const policy = webDeploymentPolicyFromAppearance(agent.appearance, allowedOrigins);
    const surface = webSurfaceForLocation(policy, origin, pageUrl.pathname);
    if (!surface) {
      console.warn(
        JSON.stringify({
          event: 'widget_surface_denied',
          origin,
          pathname: pageUrl.pathname,
          keyFingerprint: fingerprint,
        }),
      );
      return Response.json(
        { error: 'This assistant is not enabled on this area of the product.' },
        { status: 403, headers: corsHeaders(origin) },
      );
    }

    let verifiedUserId: string | undefined;
    if (input.identityToken) {
      try {
        verifiedUserId = (
          await verifyWebAgentIdentity(input.identityToken, {
            organizationId: agent.organizationId,
            agentId: agent.id,
            origin,
          })
        ).userFingerprint;
      } catch {
        return Response.json(
          { error: 'Signed-in user verification failed.' },
          { status: 401, headers: corsHeaders(origin) },
        );
      }
    }

    // Installation is proved by a genuine browser request, not by a dashboard checkbox. This
    // happens before the active-state gate so a draft can be installed and verified before the
    // merchant turns it on. The public session still remains unavailable until activation.
    const recentProofs = await getWebAgentDb()
      .select({ metadata: auditLogs.metadata, createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, agent.organizationId),
          eq(auditLogs.resourceType, 'agent'),
          eq(auditLogs.resourceId, agent.id),
          eq(auditLogs.action, 'agent.installation_verified'),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(12);
    const recentlyProved = recentProofs.some((proof) => {
      const metadata = proof.metadata as { origin?: string; pathname?: string } | null;
      return (
        metadata?.origin === origin &&
        metadata?.pathname === pageUrl.pathname &&
        proof.createdAt.getTime() > Date.now() - 24 * 60 * 60 * 1_000
      );
    });
    if (!recentlyProved) {
      await getWebAgentDb()
        .insert(auditLogs)
        .values({
          organizationId: agent.organizationId,
          actorId: null,
          action: 'agent.installation_verified',
          resourceType: 'agent',
          resourceId: agent.id,
          metadata: {
            platform: 'web',
            origin,
            pathname: pageUrl.pathname,
            surfaceId: surface.id,
            surfaceName: surface.name,
            sdk: 'embed-v2',
            // Route inventory is evidence for the merchant's setup screen, never authorization.
            // Path-only records cannot contain a host page's query string, fragment, form data,
            // session data, or source code.
            ...(input.routeInventory
              ? {
                  routeInventory: input.routeInventory.routes
                    .filter(
                      (route) => route.pathname.startsWith('/') && !route.pathname.includes('..'),
                    )
                    .map((route) => ({
                      pathname: route.pathname.replace(/\/+/g, '/').replace(/\/+$/g, '') || '/',
                      ...(route.name ? { name: route.name } : {}),
                      source: route.source,
                    })),
                }
              : {}),
          },
        });
    }

    if (agent.status !== 'active' || !agent.executionLeaseId) {
      return Response.json(
        { error: 'This assistant is installed but is not turned on yet.' },
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

    if (surface.identity === 'required' && verifiedUserId === undefined) {
      return Response.json(
        { error: 'Please sign in before opening this assistant.' },
        { status: 401, headers: corsHeaders(origin) },
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
      // Identity state must match exactly. A customer who signs out cannot keep a verified
      // conversation through its 24-hour continuation token, and an anonymous journey is never
      // silently merged into a signed-in account.
      if (previous.verifiedUserId === verifiedUserId) {
        visitorSessionId = previous.visitorSessionId;
        continuationAccepted = true;
      }
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
      pathname: pageUrl.pathname,
      surfaceId: surface.id,
      identityVerified: verifiedUserId !== undefined,
      keyFingerprint: fingerprint,
    });
    const claims = {
      organizationId: agent.organizationId,
      agentId: agent.id,
      origin,
      keyFingerprint: fingerprint,
      visitorSessionId,
      ...(verifiedUserId !== undefined ? { verifiedUserId } : {}),
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
                eq(conversations.visitorId, widgetVisitorFingerprint(claims)),
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

    const persona = agent.persona as { displayName?: string };
    const voiceServiceOrigin = (
      process.env.VOICE_SERVICE_ORIGIN ??
      (process.env.NODE_ENV === 'development' ? 'http://localhost:7860' : undefined)
    )?.replace(/\/$/, '');
    // Keep browser WebRTC traffic on the same trusted dashboard edge as session and chat.
    // The dashboard proxy then relays it server-to-server to the voice service. This removes
    // an unreliable second browser-to-service CORS hop while keeping the voice edge private.
    const voiceStartUrl = voiceServiceOrigin
      ? `${publicRequestOrigin(request)}/web-agent-voice/start`
      : undefined;
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
          voiceEnabled: agent.voiceEnabled,
          voice:
            agent.voiceEnabled && voiceStartUrl
              ? { transport: 'webrtc', startUrl: voiceStartUrl }
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
