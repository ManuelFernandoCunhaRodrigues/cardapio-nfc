import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@salgae/core/database/database.types';

export type AppSupabaseClient = SupabaseClient<Database>;

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type SupabaseClientFactory = {
  createPublicClient: () => AppSupabaseClient;
  createUserClient: (accessToken: string) => AppSupabaseClient;
};

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

const noStoreFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, { ...init, cache: 'no-store' });

function createPublicClient(config: SupabaseConfig): AppSupabaseClient {
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: authOptions,
    global: { fetch: noStoreFetch },
  });
}

function createUserClient(config: SupabaseConfig, accessToken: string): AppSupabaseClient {
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: authOptions,
    global: { fetch: noStoreFetch, headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function createSupabaseClientFactory(config: SupabaseConfig): SupabaseClientFactory {
  return {
    createPublicClient: () => createPublicClient(config),
    createUserClient: (accessToken) => createUserClient(config, accessToken),
  };
}
