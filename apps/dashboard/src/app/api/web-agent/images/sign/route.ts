import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { agents, conversations } from '@voomate/db';
import { ZodError } from 'zod';
import { getWebAgentDb } from '@/lib/web-agent/db';
import {
  cleanupExpiredImages,
  createImageUploadSlots,
  ImageUploadError,
} from '@/lib/web-agent/images';
import { flushRunEvents, type RunContext } from '@/lib/web-agent/log';
import { enforceImageUploadRateLimit } from '@/lib/web-agent/rate-limit';
import {
  bearerToken,
  corsHeaders,
  imageSignRequestSchema,
  normalizeOrigin,
  sessionFingerprint,
  verifyWidgetSession,
} from '@/lib/web-agent/security';

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
    if (!token) throw new ImageUploadError('Session token required.', 401);
    const claims = await verifyWidgetSession(token, origin);
    const input = imageSignRequestSchema.parse(await request.json());
    const fingerprint = sessionFingerprint(token);
    await enforceImageUploadRateLimit(
      `${claims.keyFingerprint}:${origin}:${fingerprint}`,
      input.files.length,
    );

    const db = getWebAgentDb();
    const [agent] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(
        and(
          eq(agents.organizationId, claims.organizationId),
          eq(agents.id, claims.agentId),
          eq(agents.status, 'published'),
        ),
      )
      .limit(1);
    if (!agent) throw new ImageUploadError('Agent is no longer available.', 403);

    if (input.conversationId) {
      const [conversation] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.organizationId, claims.organizationId),
            eq(conversations.agentId, claims.agentId),
          ),
        )
        .limit(1);
      if (!conversation)
        throw new ImageUploadError('Conversation does not belong to this session.');
    }

    context = {
      organizationId: claims.organizationId,
      agentId: claims.agentId,
      runId: randomUUID(),
      conversationId: input.conversationId,
      eventBuffer: [],
      usageBuffer: [],
    };
    // Opportunistic cleanup complements the scheduled cleanup endpoint and keeps local/dev tidy.
    await cleanupExpiredImages(25).catch(() => undefined);
    const uploads = await createImageUploadSlots({
      context,
      sessionFingerprint: fingerprint,
      files: input.files,
      conversationId: input.conversationId,
    });
    await flushRunEvents(context);
    return Response.json(
      { uploads },
      { status: 201, headers: { ...corsHeaders(origin), 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (context) await flushRunEvents(context).catch(() => undefined);
    const rateLimited = error instanceof Error && error.message === 'RATE_LIMITED';
    const status = rateLimited ? 429 : error instanceof ImageUploadError ? error.status : 400;
    const message = rateLimited
      ? 'Too many image uploads. Please wait a minute and try again.'
      : error instanceof ZodError
        ? 'Attach 1 or 2 valid JPG, PNG, or WebP images.'
        : error instanceof ImageUploadError
          ? error.message
          : 'The image upload request is invalid.';
    return Response.json({ error: message }, { status, headers: corsHeaders(origin) });
  }
}
