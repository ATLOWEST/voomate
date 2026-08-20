/**
 * Supabase client for server components, route handlers and middleware.
 *
 * The session lives in cookies rather than localStorage specifically so that server components
 * can read it. That is what lets the authenticated shell redirect *before* rendering: a
 * client-side guard paints the sidebar, the org name and the navigation, and only then
 * redirects — which shows the shape of a customer's account to someone who is not signed in.
 *
 * Only ever the anon key here. The service role key bypasses RLS and must not exist in any
 * process that serves a page to a browser.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server components cannot set cookies. That is fine here: the middleware
            // refreshes the session on every request, so a token that expired mid-render is
            // already renewed by the time the next request arrives. Throwing would turn a
            // routine refresh into a 500.
          }
        },
      },
    },
  );
};

/**
 * The signed-in user, or null.
 *
 * `getUser()` rather than `getSession()`, deliberately. `getSession` reads the cookie and
 * trusts it; `getUser` verifies the token with Supabase. On a server that is about to decide
 * whether to render another tenant's data, the difference is the whole security boundary — a
 * cookie is attacker-writable, a verified token is not.
 */
export const getUser = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Treat every Auth failure as an anonymous request. The caller must never learn whether a
  // session cookie was expired, forged, or revoked; protected layouts redirect uniformly.
  if (error !== null || user === null) return null;
  return user;
};

/** The access token to forward to the API as a bearer credential. */
export const getAccessToken = async (): Promise<string | undefined> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
};
