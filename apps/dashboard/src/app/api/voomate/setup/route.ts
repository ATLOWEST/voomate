/**
 * POST /api/voomate/setup
 *
 * Same-origin endpoint called by the Voomate embed.js SDK.
 *
 * Security contract:
 *  - This handler only accepts a same-origin browser call. It derives the
 *    trusted server origin from the request URL and rejects a page URL or
 *    browser Origin from any other domain.
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

  // The SDK sends the current page URL. The server endpoint must live on the
  // same customer domain; otherwise a copied public agent ID could ask this
  // server to claim a third-party website.
  let pageUrl: URL;
  try {
    pageUrl = new URL(input.pageUrl);
  } catch {
    return Response.json({ error: 'pageUrl is not a valid URL.' }, { status: 400 });
  }

  const serverOrigin = new URL(request.url).origin;
  const browserOrigin = request.headers.get('origin');
  if (pageUrl.origin !== serverOrigin || browserOrigin !== serverOrigin) {
    return Response.json({ error: 'Voomate setup must be called from this same site.' }, { status: 403 });
  }

  // Forward only pathname and a path-only route list. Strip all query strings,
  // hash fragments, cookies, and any other data.
  const pageOrigin = pageUrl.origin;
  const routes = Array.isArray(input.routes)
    ? input.routes.filter((r): r is string => typeof r === 'string').map((r) => {
        try {
          // Accept either a full URL or a path; keep only the pathname.
          return new URL(r, pageOrigin).pathname;
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
        origin: pageOrigin,
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
