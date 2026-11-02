import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../shared/errors/domain-errors.js';
import { category, highlight, product, sitemapItem } from './menu.test-fixtures.js';
import { MenuService, type MenuRepository } from './menu.service.js';

function fakeRepository(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    listCategories: vi.fn().mockResolvedValue([category]),
    listProducts: vi.fn().mockResolvedValue([product]),
    listHighlights: vi.fn().mockResolvedValue([highlight]),
    findProductById: vi.fn().mockResolvedValue(product),
    findProductBySlug: vi.fn().mockResolvedValue(product),
    findCategory: vi.fn().mockResolvedValue({ name: category.name, slug: category.slug }),
    listProductsByCategory: vi.fn().mockResolvedValue([product]),
    listSitemapItems: vi.fn().mockResolvedValue([sitemapItem]),
    ...overrides,
  };
}

describe('MenuService', () => {
  it('returns a menu validated by the public contract', async () => {
    const service = new MenuService(fakeRepository());

    await expect(service.listMenu()).resolves.toEqual({
      categories: [category],
      products: [product],
      highlights: [highlight],
    });
  });

  it('finds a legacy UUID through the id lookup', async () => {
    const repository = fakeRepository();
    const service = new MenuService(repository);

    const result = await service.getProduct(product.id);

    expect(result.product).toEqual(product);
    expect(repository.findProductById).toHaveBeenCalledWith(product.id);
    expect(repository.findProductBySlug).not.toHaveBeenCalled();
  });

  it('removes the current product from related products', async () => {
    const otherProduct = { ...product, id: '44444444-4444-4444-8444-444444444444' };
    const service = new MenuService(
      fakeRepository({
        listProductsByCategory: vi.fn().mockResolvedValue([product, otherProduct]),
      }),
    );

    const result = await service.getProduct(product.slug);

    expect(result.relatedProducts).toEqual([otherProduct]);
  });

  it('throws NotFoundError when the product is not public', async () => {
    const service = new MenuService(
      fakeRepository({ findProductBySlug: vi.fn().mockResolvedValue(null) }),
    );

    await expect(service.getProduct('ausente')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects malformed repository data', async () => {
    const service = new MenuService(
      fakeRepository({ listCategories: vi.fn().mockResolvedValue([{ id: 'invalid' }]) }),
    );

    await expect(service.listMenu()).rejects.toBeTruthy();
  });
});
