/**
 * POST /api/voomate/setup
 *
 * Same-origin endpoint called by the Voomate embed.js SDK.
 *
 * Security contract:
 *  - Origin is derived from the server-side request URL, never from a
 *    browser-supplied header (Origin / Referer / X-Forwarded-Host).
 *  - Only pathname and a path-only route list are forwarded upstream.
 *    Query strings, cookies, form values, and customer data are never read
 *    or forwarded.
 *  - VOOMATE_API_KEY is a server-only secret stored in AWS Secrets Manager
 *    (voomate/prod/runtime). It is never written to source files, logs,
 *    public env vars, or the browser.
 *  - The route is unauthenticated at the app layer; rate-limiting and
 *    replay protection are enforced by the Voomate platform on the key side.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.VOOMATE_API_KEY;
  if (!apiKey) {
    console.error('[voomate/setup] VOOMATE_API_KEY is not configured.');
    return Response.json({ error: 'Agent not configured on this server.' }, { status: 503 });
  }

  let input: { pageUrl?: unknown; routes?: unknown };
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof input.pageUrl !== 'string') {
    return Response.json({ error: 'pageUrl is required.' }, { status: 400 });
  }

  // Derive the trusted origin from the server request URL — never from the
  // browser-supplied Origin or Referer headers.
  const origin = new URL(request.url).origin;

  let pageUrl: URL;
  try {
    pageUrl = new URL(input.pageUrl);
  } catch {
    return Response.json({ error: 'pageUrl is not a valid URL.' }, { status: 400 });
  }

  // Reject requests where the page origin does not match this server's origin.
  if (pageUrl.origin !== origin) {
    return Response.json({ error: 'Origin mismatch.' }, { status: 400 });
  }

  // Forward only pathname and a path-only route list. Strip all query strings,
  // hash fragments, cookies, and any other data.
  const routes = Array.isArray(input.routes)
    ? input.routes.filter((r): r is string => typeof r === 'string').map((r) => {
        try {
          // Accept either a full URL or a path; keep only the pathname.
          return new URL(r, origin).pathname;
        } catch {
          return null;
        }
      }).filter((r): r is string => r !== null)
    : [];

  const upstream = await fetch(
    'https://app.atlowest.in/api/v1/widget/installations/claim',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin,
        pathname: pageUrl.pathname,
        routes,
      }),
    },
  );

  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }

  return Response.json(await upstream.json(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

// The SDK may preflight before posting.
export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://atlowest.in',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
