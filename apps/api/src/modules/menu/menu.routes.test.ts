import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../shared/http/error-handler';
import type { AppHonoEnv } from '../../shared/types';
import { createMenuController } from './menu.controller';
import { createMenuRoutes } from './menu.routes';
import { category, highlight, product, sitemapItem } from './menu.test-fixtures';
import { MenuService, type MenuRepository } from './menu.service';

function testApp(foundProduct: unknown = product) {
  const repository: MenuRepository = {
    listCategories: async () => [category],
    listProducts: async () => [product],
    listHighlights: async () => [highlight],
    findProductById: async () => foundProduct,
    findProductBySlug: async () => foundProduct,
    findCategory: async () => ({ name: category.name, slug: category.slug }),
    listProductsByCategory: async () => [product],
    listSitemapItems: async () => [sitemapItem],
  };
  const app = new Hono<AppHonoEnv>();
  app.onError(errorHandler);
  app.route('/v1', createMenuRoutes(createMenuController(new MenuService(repository))));
  return app;
}

describe('public menu routes', () => {
  it('GET /v1/menu returns the public menu', async () => {
    const response = await testApp().request('/v1/menu');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      categories: [category],
      products: [product],
      highlights: [highlight],
    });
  });

  it('GET /v1/menu/products/:slug returns the product page', async () => {
    const response = await testApp().request(`/v1/menu/products/${product.slug}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ product, relatedProducts: [] });
  });

  it('GET /v1/menu/products/:slug returns 404 for an absent product', async () => {
    const response = await testApp(null).request('/v1/menu/products/ausente');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ status: 'error', message: 'Produto não encontrado.' });
  });

  it('GET /v1/menu/products/:slug rejeita identificador inválido sem consultar o repositório', async () => {
    const response = await testApp().request('/v1/menu/products/Produto%20invalido');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ status: 'error', message: 'Produto não encontrado.' });
  });

  it('GET /v1/menu/sitemap returns sitemap items', async () => {
    const response = await testApp().request('/v1/menu/sitemap');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([sitemapItem]);
  });
});
