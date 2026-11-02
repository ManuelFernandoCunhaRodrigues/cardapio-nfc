import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createSupabaseClientFactory } from './shared/supabase/supabase-client-factory.js';

const env = loadEnv();

export default createApp({ env, supabase: createSupabaseClientFactory(env) });
