import { randomUUID } from 'node:crypto';
import { finalizeImageUploads, ImageUploadError } from '@/lib/web-agent/images';
import { flushRunEvents, type RunContext } from '@/lib/web-agent/log';
import { enforceWidgetRateLimit } from '@/lib/web-agent/rate-limit';
import {
  bearerToken,
  corsHeaders,
  imageFinalizeRequestSchema,
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

  let context: RunContext | undefined;
  try {
    const token = bearerToken(request);
    if (!token) throw new ImageUploadError('Session token required.', 401);
    const claims = await verifyWidgetSession(token, origin);
    const input = imageFinalizeRequestSchema.parse(await request.json());
    await enforceWidgetRateLimit(`${claims.keyFingerprint}:${origin}`);
    context = {
      organizationId: claims.organizationId,
      agentId: claims.agentId,
      runId: randomUUID(),
      eventBuffer: [],
      usageBuffer: [],
    };
    const images = await finalizeImageUploads({
      context,
      sessionFingerprint: widgetVisitorFingerprint(claims),
      imageIds: input.imageIds,
    });
    await flushRunEvents(context);
    return Response.json(
      { images },
      { headers: { ...corsHeaders(origin), 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (context) await flushRunEvents(context).catch(() => undefined);
    const rateLimited = error instanceof Error && error.message === 'RATE_LIMITED';
    const status = rateLimited ? 429 : error instanceof ImageUploadError ? error.status : 400;
    const message = rateLimited
      ? 'Too many requests. Please wait and try again.'
      : error instanceof ImageUploadError
        ? error.message
        : 'The image could not be validated.';
    return Response.json({ error: message }, { status, headers: corsHeaders(origin) });
  }
}
