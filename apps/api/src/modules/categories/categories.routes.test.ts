import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../shared/http/error-handler';
import type { AppHonoEnv } from '../../shared/types';
import { adminRequest, fakeAdminClients } from '../../test-support/admin-clients';
import { createCategoriesController } from './categories.controller';
import { createCategoriesRoutes } from './categories.routes';
import { CategoriesService, type CategoryRepository } from './categories.service';

const categoryId = '11111111-1111-4111-8111-111111111111';
const validInput = { name: 'Coxinhas', slug: 'coxinhas', description: '', is_active: true };

function fakeRepository(): CategoryRepository {
  return {
    listForAdmin: async () => [],
    create: vi.fn(async () => categoryId),
    update: vi.fn(async () => true),
    setActive: vi.fn(async () => true),
    listSortOrders: async () => [],
    swapSortOrders: async () => undefined,
    delete: vi.fn(async () => ({ imagePath: null })),
    isImageInUse: async () => false,
    removeImageFiles: async () => undefined,
  };
}

function testApp(repository = fakeRepository()) {
  const service = new CategoriesService(repository);
  const app = new Hono<AppHonoEnv>();
  app.onError(errorHandler);
  app.route(
    '/v1/admin/categories',
    createCategoriesRoutes(
      fakeAdminClients(),
      createCategoriesController(() => service),
      {
        upload: async (context) => context.json({ path: 'categories/test/image' }, 201),
        remove: async (context) => context.body(null, 204),
      },
    ),
  );
  return app;
}

describe('rotas de categorias do painel', () => {
  it('exigem token de admin', async () => {
    const response = await testApp().request('/v1/admin/categories');

    expect(response.status).toBe(401);
  });

  it('POST cria a categoria e devolve o id', async () => {
    const repository = fakeRepository();

    const response = await testApp(repository).request(
      '/v1/admin/categories',
      adminRequest('POST', validInput),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: categoryId });
    expect(repository.create).toHaveBeenCalledWith({ ...validInput, description: null });
  });

  it('POST responde 400 com os erros por campo', async () => {
    const response = await testApp().request(
      '/v1/admin/categories',
      adminRequest('POST', { ...validInput, slug: 'Com Espaço' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      fieldErrors: { slug: ['Use letras minúsculas, números e hífens.'] },
    });
  });

  it('PUT com id inválido responde 400 sem tocar no banco', async () => {
    const repository = fakeRepository();

    const response = await testApp(repository).request(
      '/v1/admin/categories/nao-e-uuid',
      adminRequest('PUT', validInput),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'Categoria inválida.' });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('PUT /:id/active liga ou desliga a categoria', async () => {
    const repository = fakeRepository();

    const response = await testApp(repository).request(
      `/v1/admin/categories/${categoryId}/active`,
      adminRequest('PUT', { is_active: false }),
    );

    expect(response.status).toBe(204);
    expect(repository.setActive).toHaveBeenCalledWith(categoryId, false);
  });

  it('DELETE apaga a categoria', async () => {
    const repository = fakeRepository();

    const response = await testApp(repository).request(
      `/v1/admin/categories/${categoryId}`,
      adminRequest('DELETE'),
    );

    expect(response.status).toBe(204);
    expect(repository.delete).toHaveBeenCalledWith(categoryId);
  });
});
