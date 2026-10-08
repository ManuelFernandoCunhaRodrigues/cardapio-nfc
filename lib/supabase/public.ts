import { createClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from '@/lib/env';

/** Cliente anônimo sem cookies, próprio para páginas públicas cacheáveis. */
export function createPublicClient() {
  const env = getSupabaseEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
