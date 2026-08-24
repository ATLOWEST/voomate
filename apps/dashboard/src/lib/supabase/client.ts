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

const RUNTIME_CONFIG_STORAGE_KEY = 'voomate-public-runtime-config';

type RuntimeConfig = NonNullable<Window['__VOOMATE_ENV__']>;

/**
 * `NEXT_PUBLIC_*` variables are intentionally injected at request time because the same image
 * runs in more than one environment. A dashboard route may begin hydrating before Next's Script
 * component has restored that global, so retain the public (non-secret) values after the first
 * successful page load as a safe browser fallback.
 */
const browserRuntimeConfig = (): RuntimeConfig | undefined => {
  if (typeof window === 'undefined') return undefined;

  const injected = window.__VOOMATE_ENV__;
  if (injected?.supabaseUrl && injected.supabaseAnonKey) {
    try {
      window.localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(injected));
    } catch {
      // Storage is optional; the current page's injected values are still usable.
    }
    return injected;
  }

  try {
    const stored = window.localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
    if (!stored) return undefined;
    const parsed = JSON.parse(stored) as RuntimeConfig;
    if (parsed.supabaseUrl && parsed.supabaseAnonKey) return parsed;
  } catch {
    // A malformed or unavailable storage entry must never break sign-in.
  }

  return undefined;
};

export const createClient = () => {
  const runtimeConfig = browserRuntimeConfig();
  const url = runtimeConfig?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = runtimeConfig?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Secure sign-in is temporarily unavailable. Please reload and try again.');
  }

  return createBrowserClient(url, anonKey);
};
