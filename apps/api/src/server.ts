import { serve } from '@hono/node-server';

import { createStandaloneApp } from './app';
import { loadEnv } from './config/env';

const env = loadEnv();
const port = env.PORT ?? 4000;
const app = createStandaloneApp(env);

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
