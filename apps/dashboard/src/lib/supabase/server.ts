/**
 * Supabase client for server components, route handlers and middleware.
 *
 * Safe fallback is included when running in demo/offline preview mode without live Supabase keys.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const createClient = async () => {
  const cookieStore = await cookies();

  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_KEY;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => {
        try {
          return cookieStore.getAll();
        } catch {
          return [];
        }
      },
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies.
        }
      },
    },
  });
};

/**
 * Identity verified by the request middleware.
 *
 * Middleware overwrites these internal request headers only after Supabase has verified the
 * session. Reusing that result avoids a second remote `/auth/v1/user` request before every
 * dashboard navigation. The normal `getUser()` path remains the safe fallback for requests
 * that do not pass through middleware.
 */
export const getMiddlewareIdentity = async (): Promise<
  { id: string; email: string | undefined } | undefined
> => {
  const requestHeaders = await headers();
  const id = requestHeaders.get('x-voomate-verified-user-id');
  if (id === null || id === '') return undefined;

  const encodedEmail = requestHeaders.get('x-voomate-verified-user-email');
  try {
    return { id, email: encodedEmail ? decodeURIComponent(encodedEmail) : undefined };
  } catch {
    // A malformed value must never block a verified session. The identity itself is the ID.
    return { id, email: undefined };
  }
};

/**
 * The signed-in user, or null.
 */
export const getUser = async () => {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error !== null || user === null) return null;
    return user;
  } catch {
    return null;
  }
};

/** The access token to forward to the API as a bearer credential. */
export const getAccessToken = async (): Promise<string | undefined> => {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return undefined;

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  } catch {
    return undefined;
  }
};

/** Platform administration is an explicit global allowlist, never a tenant role or UI fallback. */
export const isPlatformAdministrator = async (userId: string): Promise<boolean> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('platform_administrators')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    return error === null && data !== null;
  } catch {
    return false;
  }
};
