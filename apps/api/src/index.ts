import { createApp } from './app';
import { loadEnv } from './config/env';
import { createSupabaseClientFactory } from './shared/supabase/supabase-client-factory';

const env = loadEnv();

export default createApp({ env, supabase: createSupabaseClientFactory(env) });
