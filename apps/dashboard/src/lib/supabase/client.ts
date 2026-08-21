/**
 * Supabase client for the browser.
 *
 * Used for the two things that genuinely belong client-side: the sign-in form, and reading the
 * current access token to attach to API calls. All tenant data goes through the Fastify API,
 * not through this client — the API is where tenant scoping, role checks and rate limits live,
 * and querying Postgres directly from the browser would route around all three.
 */
import { createBrowserClient } from '@supabase/ssr';

declare global {
  interface Window {
    __VOOMATE_ENV__?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
  }
}

export const createClient = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' ? window.__VOOMATE_ENV__?.supabaseUrl : undefined) ||
    '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' ? window.__VOOMATE_ENV__?.supabaseAnonKey : undefined) ||
    '';

  return createBrowserClient(url, anonKey);
};
