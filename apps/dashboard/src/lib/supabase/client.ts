/**
 * Supabase client for the browser.
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
  const runtimeConfig = typeof window !== 'undefined' ? window.__VOOMATE_ENV__ : undefined;
  const url = runtimeConfig?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = runtimeConfig?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Secure sign-in is temporarily unavailable. Please reload and try again.');
  }

  return createBrowserClient(url, anonKey);
};
