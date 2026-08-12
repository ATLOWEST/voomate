import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const WEB_AGENT_IMAGE_BUCKET = 'web-agent-images';
let client: SupabaseClient | undefined;

/** Server-only Supabase client. The service key must never enter Next public env or widget code. */
export function webAgentStorage(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for image uploads.');
  }
  client ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
