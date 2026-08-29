import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { agents } from '@voomate/db';
import { webDeploymentPolicyFromAppearance, webSurfaceForLocation } from '@voomate/core';
import { getWebAgentDb } from '@/lib/web-agent/db';
import { enforceWidgetAccessRateLimit } from '@/lib/web-agent/rate-limit';
import { corsHeaders, keyFingerprint, normalizeOrigin } from '@/lib/web-agent/security';

export const runtime = 'nodejs';

const accessRequestSchema = z.object({
  publicKey: z.string().min(12).max(160),
  pageUrl: z.string().url().max(2_048),
});

export function OPTIONS(request: Request): Response {
  const origin = normalizeOrigin(request.headers.get('origin')) ?? 'null';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/**
 * Cheap public policy gate used by the SDK heartbeat. It returns no agent configuration,
 * identity, tenant data, or page content and can never mint an execution token.
 */
export async function POST(request: Request): Promise<Response> {
  const origin = normalizeOrigin(request.headers.get('origin'));
  if (!origin) return Response.json({ allowed: false }, { status: 403 });

  const headers = { ...corsHeaders(origin), 'Cache-Control': 'no-store, private' };
  try {
    const input = accessRequestSchema.parse(await request.json());
    const pageUrl = new URL(input.pageUrl);
    if (normalizeOrigin(pageUrl.origin) !== origin) {
      return Response.json({ allowed: false }, { status: 403, headers });
    }

    const fingerprint = keyFingerprint(input.publicKey);
    await enforceWidgetAccessRateLimit(`${fingerprint}:${origin}`);
    const [agent] = await getWebAgentDb()
      .select({
        status: agents.status,
        allowedOrigins: agents.allowedOrigins,
        appearance: agents.appearance,
        desiredStateRevision: agents.desiredStateRevision,
        executionLeaseId: agents.executionLeaseId,
      })
      .from(agents)
      .where(eq(agents.embedKey, input.publicKey))
      .limit(1);

    const allowedOrigins = (agent?.allowedOrigins ?? [])
      .map((value) => normalizeOrigin(value))
      .filter((value): value is string => Boolean(value));
    const surface = agent
      ? webSurfaceForLocation(
          webDeploymentPolicyFromAppearance(agent.appearance, allowedOrigins),
          origin,
          pageUrl.pathname,
        )
      : undefined;
    const allowed =
      agent?.status === 'active' &&
      Boolean(agent.executionLeaseId) &&
      allowedOrigins.includes(origin) &&
      surface !== undefined;

    if (!allowed) return Response.json({ allowed: false }, { status: 403, headers });
    return Response.json(
      { allowed: true, configurationRevision: agent.desiredStateRevision },
      { headers },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMITED') {
      return Response.json({ allowed: false }, { status: 429, headers });
    }
    return Response.json({ allowed: false }, { status: 400, headers });
  }
}
