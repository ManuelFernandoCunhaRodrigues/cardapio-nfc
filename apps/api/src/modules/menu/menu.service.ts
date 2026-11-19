import {
  publicMenuResponseSchema,
  publicProductResponseSchema,
  publicSitemapResponseSchema,
  type PublicMenuResponse,
  type PublicProductResponse,
  type PublicSitemapItem,
} from '@salgae/core/contracts/public-api';
import { z } from 'zod';

import { NotFoundError } from '../../shared/errors/domain-errors';

export interface MenuRepository {
  listCategories(): Promise<unknown>;
  listProducts(): Promise<unknown>;
  listHighlights(): Promise<unknown>;
  findProductById(id: string): Promise<unknown>;
  findProductBySlug(slug: string): Promise<unknown>;
  findCategory(id: string): Promise<unknown>;
  listProductsByCategory(categoryId: string): Promise<unknown>;
  listSitemapItems(): Promise<unknown>;
}

export class MenuService {
  constructor(private readonly repository: MenuRepository) {}

  async listMenu(): Promise<PublicMenuResponse> {
    const [categories, products, highlights] = await Promise.all([
      this.repository.listCategories(),
      this.repository.listProducts(),
      this.repository.listHighlights(),
    ]);
    return publicMenuResponseSchema.parse({ categories, products, highlights });
  }

  async getProduct(slugOrId: string): Promise<PublicProductResponse> {
    const product = await this.findProduct(slugOrId);
    if (!product) throw new NotFoundError('Produto não encontrado.');

    const parsedProduct = publicProductResponseSchema.shape.product.parse(product);
    const [category, relatedProducts] = await Promise.all([
      this.repository.findCategory(parsedProduct.category_id),
      this.repository.listProductsByCategory(parsedProduct.category_id),
    ]);
    if (!category) throw new NotFoundError('Categoria do produto não encontrada.');

    return publicProductResponseSchema.parse({
      product: parsedProduct,
      category,
      relatedProducts: Array.isArray(relatedProducts)
        ? relatedProducts.filter((item) => this.hasDifferentId(item, parsedProduct.id))
        : relatedProducts,
    });
  }

  async listSitemapItems(): Promise<PublicSitemapItem[]> {
    return publicSitemapResponseSchema.parse(await this.repository.listSitemapItems());
  }

  private findProduct(slugOrId: string): Promise<unknown> {
    return z.uuid().safeParse(slugOrId).success
      ? this.repository.findProductById(slugOrId)
      : this.repository.findProductBySlug(slugOrId);
  }

  private hasDifferentId(value: unknown, productId: string): boolean {
    return (
      typeof value !== 'object' || value === null || !('id' in value) || value.id !== productId
    );
  }
}
