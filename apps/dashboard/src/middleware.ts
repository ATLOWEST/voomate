/**
 * Session refresh.
 *
 * Supabase access tokens are short-lived by design. Server components can read cookies but
 * cannot write them, so without this the refresh never gets persisted and the user is signed
 * out roughly every hour mid-task. Middleware runs before every matched request and *can*
 * write, which makes it the one correct place for this.
 *
 * It refreshes only. The redirect decision stays in the authenticated layout, where it can be
 * made against a verified user rather than the presence of a cookie.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const APP_HOST = 'app.atlowest.in';
const ADMIN_HOST = 'admin.atlowest.in';
const LEGACY_DASHBOARD_HOST = 'dashboard.atlowest.in';

const portalRedirect = (request: NextRequest): NextResponse | undefined => {
  const host = request.nextUrl.hostname.toLowerCase();
  const { pathname, search } = request.nextUrl;
  const suffix = `${pathname}${search}`;

  if (host === LEGACY_DASHBOARD_HOST) {
    const destination = pathname.startsWith('/admin') ? ADMIN_HOST : APP_HOST;
    return NextResponse.redirect(new URL(`https://${destination}${suffix}`), 308);
  }

  if (host === APP_HOST && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL(`https://${ADMIN_HOST}${suffix}`), 308);
  }

  if (host !== ADMIN_HOST) return undefined;
  if (pathname === '/' || pathname === '') {
    return NextResponse.redirect(new URL(`https://${ADMIN_HOST}/admin`), 308);
  }
  if (pathname === '/sign-in' || pathname.startsWith('/auth/')) return undefined;
  if (pathname.startsWith('/admin')) return undefined;
  return NextResponse.redirect(new URL(`https://${APP_HOST}${suffix}`), 308);
};

export async function middleware(request: NextRequest) {
  const routeResponse = portalRedirect(request);
  if (routeResponse) return routeResponse;

  let response = NextResponse.next({ request });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // The call itself is the point: it triggers the refresh and the cookie write above.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation, which never carry a session
    // and would otherwise pay for a token refresh on every icon request.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
