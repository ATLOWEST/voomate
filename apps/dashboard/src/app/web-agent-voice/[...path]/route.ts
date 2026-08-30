import { corsHeaders, normalizeOrigin } from '@/lib/web-agent/security';

export const runtime = 'nodejs';

const MAX_VOICE_REQUEST_BYTES = 384 * 1024;

function responseHeaders(origin: string, upstream: Response): Headers {
  const headers = new Headers(corsHeaders(origin));
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');
  return headers;
}

export function OPTIONS(request: Request): Response {
  const origin = normalizeOrigin(request.headers.get('origin')) ?? 'null';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

async function relay(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const origin = normalizeOrigin(request.headers.get('origin'));
  if (!origin) return Response.json({ error: 'Origin header required.' }, { status: 403 });

  const voiceOrigin = process.env.VOICE_SERVICE_ORIGIN?.replace(/\/$/, '');
  if (!voiceOrigin) {
    return Response.json(
      { error: 'Voice service is not configured.' },
      { status: 503, headers: corsHeaders(origin) },
    );
  }

  const { path } = await context.params;
  const requestPath = path.join('/');
  if (
    path.length === 0 ||
    path.some((segment) => !/^[A-Za-z0-9._-]+$/.test(segment)) ||
    (request.method === 'POST' && requestPath !== 'start') ||
    (request.method === 'PATCH' && !/^sessions\/[A-Za-z0-9-]+\/api\/offer$/.test(requestPath))
  ) {
    return Response.json({ error: 'Unsupported voice request.' }, { status: 404, headers: corsHeaders(origin) });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_VOICE_REQUEST_BYTES) {
    return Response.json({ error: 'Voice request is too large.' }, { status: 413, headers: corsHeaders(origin) });
  }

  try {
    const upstream = await fetch(`${voiceOrigin}/${path.map(encodeURIComponent).join('/')}`, {
      method: request.method,
      headers: {
        origin,
        'content-type': request.headers.get('content-type') ?? 'application/json',
        accept: request.headers.get('accept') ?? 'application/json',
      },
      body,
      cache: 'no-store',
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders(origin, upstream),
    });
  } catch (error) {
    console.error('Voice transport relay failed', error);
    return Response.json(
      { error: 'Voice service is temporarily unavailable.' },
      { status: 502, headers: corsHeaders(origin) },
    );
  }
}

export function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return relay(request, context);
}

export function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return relay(request, context);
}
