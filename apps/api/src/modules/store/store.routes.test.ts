import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../shared/http/error-handler';
import type { AppHonoEnv } from '../../shared/types';
import { adminRequest, fakeAdminClients } from '../../test-support/admin-clients';
import { createAdminStoreController, createPublicStoreController } from './store.controller';
import { createAdminStoreRoutes, createPublicStoreRoutes } from './store.routes';
import { StoreService, type StoreRepository } from './store.service';
import { storeSettingsFixture } from './store.test-fixture';

function fakeRepository(settings: unknown = storeSettingsFixture): StoreRepository {
  return { findSettings: async () => settings, updateSettings: vi.fn(async () => true) };
}

function testApp(repository = fakeRepository()) {
  const service = new StoreService(repository);
  const app = new Hono<AppHonoEnv>();
  app.onError(errorHandler);
  app.route('/v1/store', createPublicStoreRoutes(createPublicStoreController(service)));
  app.route(
    '/v1/admin/store',
    createAdminStoreRoutes(
      fakeAdminClients(),
      createAdminStoreController(() => service),
    ),
  );
  return app;
}

const { opening_hours, name } = storeSettingsFixture;
const validSettingsInput = {
  name,
  tagline: '',
  address: '',
  maps_url: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  opening_hours,
  status_override: 'auto',
  notice: '',
};

describe('rotas da loja', () => {
  it('GET /v1/store devolve as configurações públicas sem token', async () => {
    const response = await testApp().request('/v1/store');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(storeSettingsFixture);
  });

  it('GET /v1/store responde 404 quando a linha única não existe', async () => {
    const response = await testApp(fakeRepository(null)).request('/v1/store');

    expect(response.status).toBe(404);
  });

  it('as rotas do painel exigem token', async () => {
    const response = await testApp().request('/v1/admin/store');

    expect(response.status).toBe(401);
  });

  it('PUT /v1/admin/store grava as configurações já normalizadas', async () => {
    const repository = fakeRepository();

    const response = await testApp(repository).request(
      '/v1/admin/store',
      adminRequest('PUT', { ...validSettingsInput, instagram: '@salgae' }),
    );

    expect(response.status).toBe(204);
    expect(repository.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ instagram: 'salgae', tagline: null }),
    );
  });

  it('PUT /v1/admin/store responde 400 com os erros por campo', async () => {
    const response = await testApp().request(
      '/v1/admin/store',
      adminRequest('PUT', { ...validSettingsInput, name: '' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      status: 'error',
      message: 'Revise os campos destacados antes de salvar.',
      fieldErrors: { name: ['Informe o nome da loja.'] },
    });
  });

  it('PUT /v1/admin/store/status grava o novo estado', async () => {
    const repository = fakeRepository();

    const response = await testApp(repository).request(
      '/v1/admin/store/status',
      adminRequest('PUT', { status_override: 'open' }),
    );

    expect(response.status).toBe(204);
    expect(repository.updateSettings).toHaveBeenCalledWith({ status_override: 'open' });
  });
});
