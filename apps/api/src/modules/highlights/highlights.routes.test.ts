import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../shared/http/error-handler';
import type { AppHonoEnv } from '../../shared/types';
import { adminRequest, fakeAdminClients } from '../../test-support/admin-clients';
import { createHighlightsController } from './highlights.controller';
import { createHighlightsRoutes } from './highlights.routes';
import { HighlightsService, type HighlightRepository } from './highlights.service';

const highlightId = '33333333-3333-4333-8333-333333333333';
const validInput = { title: 'Combo', description: '', target: '/cardapio', is_active: true };

function fakeRepository(): HighlightRepository {
  return {
    listForAdmin: async () => [],
    create: vi.fn(async () => highlightId),
    update: async () => true,
    setActive: async () => true,
    listSortOrders: async () => [
      { id: highlightId, sort_order: 1 },
      { id: '44444444-4444-4444-8444-444444444444', sort_order: 2 },
    ],
    swapSortOrders: vi.fn(async () => undefined),
    delete: async () => ({ imagePath: null }),
    isImageInUse: async () => false,
    removeImageFiles: async () => undefined,
  };
}

function testApp(repository = fakeRepository()) {
  const service = new HighlightsService(repository);
  const app = new Hono<AppHonoEnv>();
  app.onError(errorHandler);
  app.route(
    '/v1/admin/highlights',
    createHighlightsRoutes(
      fakeAdminClients(),
      createHighlightsController(() => service),
      {
        upload: async (context) => context.json({ path: 'highlights/test/image' }, 201),
        remove: async (context) => context.body(null, 204),
      },
    ),
  );
  return app;
}

describe('rotas de destaques do painel', () => {
  it('exigem token de admin', async () => {
    const response = await testApp().request('/v1/admin/highlights', { method: 'POST' });

    expect(response.status).toBe(401);
  });

  it('POST cria o destaque e devolve o id', async () => {
    const response = await testApp().request(
      '/v1/admin/highlights',
      adminRequest('POST', validInput),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: highlightId });
  });

  it('POST ignora a posição enviada pelo cliente', async () => {
    const repository = fakeRepository();

    await testApp(repository).request(
      '/v1/admin/highlights',
      adminRequest('POST', { ...validInput, sort_order: -5 }),
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ sort_order: expect.anything() }),
    );
  });

  it('POST recusa destino que não é do site nem http(s)', async () => {
    const response = await testApp().request(
      '/v1/admin/highlights',
      adminRequest('POST', { ...validInput, target: 'javascript:alert(1)' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ fieldErrors: { target: [expect.any(String)] } });
  });

  it('POST /:id/order desce o destaque uma posição', async () => {
    const repository = fakeRepository();

    const response = await testApp(repository).request(
      `/v1/admin/highlights/${highlightId}/order`,
      adminRequest('POST', { direction: 'down' }),
    );

    expect(response.status).toBe(204);
    expect(repository.swapSortOrders).toHaveBeenCalledWith(
      highlightId,
      '44444444-4444-4444-8444-444444444444',
    );
  });

  it('POST /:id/order responde 404 para destaque apagado em outra aba', async () => {
    const repository = fakeRepository();

    const response = await testApp(repository).request(
      '/v1/admin/highlights/55555555-5555-4555-8555-555555555555/order',
      adminRequest('POST', { direction: 'up' }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message: 'Destaque não encontrado.' });
    expect(repository.swapSortOrders).not.toHaveBeenCalled();
  });

  it('corpo que não é JSON responde 400', async () => {
    const response = await testApp().request('/v1/admin/highlights', {
      ...adminRequest('POST'),
      body: 'não é json',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: 'O corpo da requisição precisa ser um JSON válido.',
    });
  });
});
