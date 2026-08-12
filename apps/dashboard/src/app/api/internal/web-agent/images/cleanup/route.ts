import { timingSafeEqual } from 'node:crypto';
import { cleanupExpiredImages } from '@/lib/web-agent/images';

export const runtime = 'nodejs';

function authorized(request: Request): boolean {
  const secret = process.env.IMAGE_CLEANUP_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || secret.length < 32 || !supplied) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  const deleted = await cleanupExpiredImages(500);
  return Response.json({ deleted });
}
