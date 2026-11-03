import { serve } from '@hono/node-server';

import { createApp } from './app';
import { loadEnv } from './config/env';
import { createSupabaseClientFactory } from './shared/supabase/supabase-client-factory';

const env = loadEnv();
const port = env.PORT ?? 4000;
const app = createApp({ env, supabase: createSupabaseClientFactory(env) });

serve({ fetch: app.fetch, port }, ({ port: listeningPort }) => {
  console.log(
    JSON.stringify({
      level: 'info',
      app: 'salgae-api',
      event: 'server.started',
      port: listeningPort,
    }),
  );
});
