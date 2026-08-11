/**
 * Runtime configuration.
 *
 * Only the server env is required to boot. The Supabase, AWS and widget schemas are parsed
 * lazily, so the API starts for local development before any external service is connected —
 * and fails with a precise message the moment a route actually needs one.
 */
import {
  parseAwsEnv,
  parseServerEnv,
  parseSupabaseEnv,
  parseWidgetEnv,
  type AwsEnv,
  type ServerEnv,
  type SupabaseEnv,
  type WidgetEnv,
} from '@voomate/core';

export const serverConfig: ServerEnv = parseServerEnv();

export const isProduction = serverConfig.NODE_ENV === 'production';
export const isDevelopment = serverConfig.NODE_ENV === 'development';

const memoize = <T>(load: () => T): (() => T) => {
  let cached: T | undefined;
  return () => {
    cached ??= load();
    return cached;
  };
};

/**
 * Each of these throws a descriptive `EnvValidationError` on first use if its section of
 * `.env` is missing. That is deliberate: a missing AWS key should fail when something tries
 * to use AWS, with a message naming the variable — not at boot, blocking unrelated work.
 */
export const getSupabaseConfig: () => SupabaseEnv = memoize(parseSupabaseEnv);
export const getAwsConfig: () => AwsEnv = memoize(parseAwsEnv);
export const getWidgetConfig: () => WidgetEnv = memoize(parseWidgetEnv);
