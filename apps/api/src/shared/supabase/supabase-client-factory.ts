import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@salgae/core/database/database.types';

import type { ApiEnv } from '../../config/env';

export type AppSupabaseClient = SupabaseClient<Database>;

export type SupabaseClientFactory = {
  createPublicClient: () => AppSupabaseClient;
  createUserClient: (accessToken: string) => AppSupabaseClient;
};

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

function createPublicClient(env: ApiEnv): AppSupabaseClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: authOptions });
}

function createUserClient(env: ApiEnv, accessToken: string): AppSupabaseClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: authOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function createSupabaseClientFactory(env: ApiEnv): SupabaseClientFactory {
  return {
    createPublicClient: () => createPublicClient(env),
    createUserClient: (accessToken) => createUserClient(env, accessToken),
  };
}
