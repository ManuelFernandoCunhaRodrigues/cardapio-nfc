import { createApp } from './app';
import { createSupabaseClientFactory } from './shared/supabase/supabase-client-factory';

export type EmbeddedApiConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function createEmbeddedApi(config: EmbeddedApiConfig) {
  return createApp({ supabase: createSupabaseClientFactory(config) });
}
