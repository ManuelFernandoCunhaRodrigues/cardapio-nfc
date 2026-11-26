import type { Hono } from 'hono';
import { expect, it } from 'vitest';

import type { AppHonoEnv } from '../shared/types';
import { anonymousRequest, nonAdminRequest } from './admin-clients';

type Route = readonly [method: string, path: string];

/** Confere que cada rota de escrita recusa visitante (401) e conta sem perfil de admin (403). */
export function itRequiresAdmin(createApp: () => Hono<AppHonoEnv>, routes: readonly Route[]) {
  it.each(routes)('%s %s responde 401 sem token', async (method, path) => {
    const response = await createApp().request(path, anonymousRequest(method, {}));

    expect(response.status).toBe(401);
  });

  it.each(routes)('%s %s responde 403 para conta sem perfil de admin', async (method, path) => {
    const response = await createApp().request(path, nonAdminRequest(method, {}));

    expect(response.status).toBe(403);
  });
}
