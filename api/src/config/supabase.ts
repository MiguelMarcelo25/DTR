import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Service-role Supabase client used ONLY on the server to broker Storage
 * uploads/downloads. The service-role key bypasses RLS, so it must never be
 * exposed to the browser — all storage access is mediated by the API.
 *
 * If Supabase is not configured (e.g. local dev without storage), this is null
 * and the storage util degrades gracefully with a clear error.
 */
let supabase: SupabaseClient | null = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabaseStorageEnabled = supabase !== null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return supabase;
}
