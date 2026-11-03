import {
  adminProductSchema,
  type AdminProduct,
  type ProductInput,
  type ProductSituationInput,
  type ReorderInput,
} from '@salgae/core/contracts/admin-api';
import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';
import { parsePriceBRL } from '@salgae/core/rules/parse-price';
import { fieldsFromProductSituation } from '@salgae/core/rules/product-situation';

import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/domain-errors';
import { UniqueViolationError } from '../../shared/errors/persistence-errors';
import { reportServerError } from '../../shared/observability';
import { moveInOrder } from '../../shared/ordering/move-in-order';

type ProductMedia = { imagePath: string | null; videoPath: string | null };

/** O que o banco grava: o preço do formulário já convertido em centavos. */
export type ProductRecord = Omit<ProductInput, 'price'> & { price_cents: number };

export interface ProductRepository {
  listForAdmin(): Promise<unknown[]>;
  create(record: ProductRecord): Promise<string>;
  update(id: string, record: ProductRecord): Promise<boolean>;
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
  invalidPrice: 'Informe um preço válido, como R$ 8,90.',
};

export class ProductsService {
  constructor(private readonly repository: ProductRepository) {}

  async listProducts(): Promise<AdminProduct[]> {
    return adminProductSchema.array().parse(await this.repository.listForAdmin());
  }

  async createProduct(input: ProductInput): Promise<string> {
    const record = this.toRecord(input);
    return this.withUniqueSlug(() => this.repository.create(record));
  }

  async updateProduct(id: string, input: ProductInput): Promise<void> {
    const record = this.toRecord(input);
    this.ensureFound(await this.withUniqueSlug(() => this.repository.update(id, record)));
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

  /** O preço só é conferido depois dos outros campos, como no formulário de antes. */
  private toRecord({ price, slug, ...fields }: ProductInput): ProductRecord {
    const price_cents = parsePriceBRL(price);
    if (price_cents === null) {
      throw new ValidationError(messages.invalidPrice, { price: [messages.invalidPrice] });
    }
    return { ...fields, ...(slug ? { slug } : {}), price_cents };
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
