/**
 * Supabase client for the browser.
 */
import { createBrowserClient } from '@supabase/ssr';

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

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
    FALLBACK_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' ? window.__VOOMATE_ENV__?.supabaseAnonKey : undefined) ||
    FALLBACK_SUPABASE_KEY;

  return createBrowserClient(url, anonKey);
};
