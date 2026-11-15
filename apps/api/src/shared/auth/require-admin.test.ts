import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { adminRequest, fakeAdminClients, nonAdminRequest } from '../../test-support/admin-clients';
import { errorHandler } from '../http/error-handler';
import type { AppSupabaseClient } from '../supabase/supabase-client-factory';
import type { AppHonoEnv } from '../types';
import { requireAdmin } from './require-admin';

function testApp(clients = fakeAdminClients()) {
  const app = new Hono<AppHonoEnv>();
  app.onError(errorHandler);
  app.get('/painel', requireAdmin(clients), (context) =>
    context.json({ user: context.get('user').id, name: context.get('adminName') }),
  );
  return app;
}

describe('requireAdmin', () => {
  it('libera o administrador ativo e guarda quem é na requisição', async () => {
    const response = await testApp().request('/painel', adminRequest('GET'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: 'admin-1', name: 'Ana' });
  });

  it.each([
    ['sem cabeçalho', {}],
    ['com token desconhecido', { headers: { Authorization: 'Bearer token-vencido' } }],
  ])('responde 401 %s', async (_label, init) => {
    const response = await testApp().request('/painel', init);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      message: 'Sua sessão expirou. Entre novamente.',
    });
  });

  it('responde 403 para conta autenticada sem perfil de admin', async () => {
    const response = await testApp().request('/painel', nonAdminRequest('GET'));

    expect(response.status).toBe(403);
  });

  it('responde 500 sem detalhes quando a leitura do perfil falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const clients = fakeAdminClients();
    const client = clients.createUserClient('admin-token');
    const failingClient = {
      auth: client.auth,
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: new Error('policy quebrada') }),
          }),
        }),
      }),
    } as unknown as AppSupabaseClient;

    const response = await testApp({
      createPublicClient: () => failingClient,
      createUserClient: () => failingClient,
    }).request('/painel', adminRequest('GET'));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('policy');
  });
});
