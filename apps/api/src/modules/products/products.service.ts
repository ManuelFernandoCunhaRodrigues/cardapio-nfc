import {
  adminProductSchema,
  type AdminProduct,
  type ProductInput,
  type ProductSituationInput,
  type ReorderInput,
} from '@salgae/core/contracts/admin-api';
import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';
import { fieldsFromProductSituation } from '@salgae/core/rules/product-situation';

import { ConflictError, NotFoundError } from '../../shared/errors/domain-errors.js';
import { UniqueViolationError } from '../../shared/errors/persistence-errors.js';
import { reportServerError } from '../../shared/observability.js';
import { moveInOrder } from '../../shared/ordering/move-in-order.js';

type ProductMedia = { imagePath: string | null; videoPath: string | null };

export interface ProductRepository {
  listForAdmin(): Promise<unknown[]>;
  create(input: ProductInput): Promise<string>;
  update(id: string, input: ProductInput): Promise<boolean>;
  findCategoryId(id: string): Promise<string | null>;
  setSituation(id: string, fields: { is_active: boolean; is_available: boolean }): Promise<boolean>;
  listSortOrders(categoryId: string): Promise<Array<{ id: string; sort_order: number }>>;
  swapSortOrders(sourceId: string, neighborId: string): Promise<void>;
  delete(id: string): Promise<ProductMedia | null>;
  isImageInUse(path: string): Promise<boolean>;
  isVideoInUse(path: string): Promise<boolean>;
  removeImageFiles(paths: string[]): Promise<void>;
  removeVideoFile(path: string): Promise<void>;
}

const messages = {
  notFound: 'Produto não encontrado.',
  slugInUse: 'Esse endereço curto já está em uso. Escolha outro.',
  slugField: 'Esse endereço curto já está em uso.',
  atListEdge: 'Este produto já está no limite da categoria.',
};

export class ProductsService {
  constructor(private readonly repository: ProductRepository) {}

  async listProducts(): Promise<AdminProduct[]> {
    return adminProductSchema.array().parse(await this.repository.listForAdmin());
  }

  async createProduct(input: ProductInput): Promise<string> {
    return this.withUniqueSlug(() => this.repository.create(input));
  }

  async updateProduct(id: string, input: ProductInput): Promise<void> {
    this.ensureFound(await this.withUniqueSlug(() => this.repository.update(id, input)));
  }

  async setProductSituation(id: string, input: ProductSituationInput): Promise<void> {
    this.ensureFound(
      await this.repository.setSituation(id, fieldsFromProductSituation(input.situation)),
    );
  }

  async moveProduct(id: string, input: ReorderInput): Promise<void> {
    const categoryId = await this.repository.findCategoryId(id);
    if (!categoryId) throw new NotFoundError(messages.notFound);
    await moveInOrder(
      {
        listSortOrders: () => this.repository.listSortOrders(categoryId),
        swapSortOrders: (sourceId, neighborId) =>
          this.repository.swapSortOrders(sourceId, neighborId),
      },
      { id, ...input, edgeMessage: messages.atListEdge },
    );
  }

  async deleteProduct(id: string): Promise<void> {
    const media = await this.repository.delete(id);
    this.ensureFound(media !== null);
    if (!media) return;
    await Promise.all([
      this.cleanupMedia('image', media.imagePath),
      this.cleanupMedia('video', media.videoPath),
    ]);
  }

  private async cleanupMedia(kind: 'image' | 'video', path: string | null): Promise<void> {
    if (!path) return;
    try {
      const inUse =
        kind === 'image'
          ? await this.repository.isImageInUse(path)
          : await this.repository.isVideoInUse(path);
      if (inUse) return;
      if (kind === 'image') await this.repository.removeImageFiles(mediaObjectPaths(path));
      else await this.repository.removeVideoFile(path);
    } catch (error) {
      reportServerError({ event: `product.${kind}_cleanup_failed`, error });
    }
  }

  private async withUniqueSlug<T>(save: () => Promise<T>): Promise<T> {
    try {
      return await save();
    } catch (error) {
      if (error instanceof UniqueViolationError) {
        throw new ConflictError(messages.slugInUse, { slug: [messages.slugField] });
      }
      throw error;
    }
  }

  private ensureFound(found: boolean): void {
    if (!found) throw new NotFoundError(messages.notFound);
  }
}
