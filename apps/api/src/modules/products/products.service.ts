import {
  adminProductSchema,
  type AdminProduct,
  type ProductInput,
  type ProductSituationInput,
  type ReorderInput,
} from '@salgae/core/contracts/admin-api';
import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';
import { readPriceInput } from '@salgae/core/rules/parse-price';
import { fieldsFromProductSituation } from '@salgae/core/rules/product-situation';

import { ValidationError } from '../../shared/errors/domain-errors';
import { MissingReferenceError } from '../../shared/errors/persistence-errors';
import { requireFound, withUniqueSlug } from '../../shared/errors/record-guards';
import { moveInOrder } from '../../shared/ordering/move-in-order';
import { removeMediaIfUnused } from '../media/remove-media-if-unused';

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
  atListEdge: 'Este produto já está no limite da categoria.',
  missingCategory: 'A categoria escolhida não existe mais. Escolha outra.',
  missingCategoryField: 'Escolha uma categoria válida.',
};

export class ProductsService {
  constructor(private readonly repository: ProductRepository) {}

  async listProducts(): Promise<AdminProduct[]> {
    return adminProductSchema.array().parse(await this.repository.listForAdmin());
  }

  async createProduct(input: ProductInput): Promise<string> {
    const record = this.toRecord(input);
    return this.saveProduct(() => this.repository.create(record));
  }

  async updateProduct(id: string, input: ProductInput): Promise<void> {
    const record = this.toRecord(input);
    requireFound(
      await this.saveProduct(() => this.repository.update(id, record)),
      messages.notFound,
    );
  }

  async setProductSituation(id: string, input: ProductSituationInput): Promise<void> {
    const fields = fieldsFromProductSituation(input.situation);
    requireFound(await this.repository.setSituation(id, fields), messages.notFound);
  }

  async moveProduct(id: string, input: ReorderInput): Promise<void> {
    const categoryId = requireFound(await this.repository.findCategoryId(id), messages.notFound);
    await moveInOrder(
      {
        listSortOrders: () => this.repository.listSortOrders(categoryId),
        swapSortOrders: (sourceId, neighborId) =>
          this.repository.swapSortOrders(sourceId, neighborId),
      },
      { id, ...input, edgeMessage: messages.atListEdge, notFoundMessage: messages.notFound },
    );
  }

  async deleteProduct(id: string): Promise<void> {
    const media = requireFound(await this.repository.delete(id), messages.notFound);
    await Promise.all([
      this.cleanupMedia('image', media.imagePath),
      this.cleanupMedia('video', media.videoPath),
    ]);
  }

  private async cleanupMedia(kind: 'image' | 'video', path: string | null): Promise<void> {
    await removeMediaIfUnused(
      path,
      kind === 'image'
        ? {
            isInUse: (current) => this.repository.isImageInUse(current),
            remove: (current) => this.repository.removeImageFiles(mediaObjectPaths(current)),
          }
        : {
            isInUse: (current) => this.repository.isVideoInUse(current),
            remove: (current) => this.repository.removeVideoFile(current),
          },
      `product.${kind}_cleanup_failed`,
    );
  }

  /** O preço só é conferido depois dos outros campos, como no formulário de antes. */
  private toRecord({ price, slug, ...fields }: ProductInput): ProductRecord {
    const reading = readPriceInput(price);
    if (!reading.ok) throw new ValidationError(reading.message, { price: [reading.message] });
    return { ...fields, ...(slug ? { slug } : {}), price_cents: reading.cents };
  }

  private async saveProduct<T>(save: () => Promise<T>): Promise<T> {
    try {
      return await withUniqueSlug(save);
    } catch (error) {
      // A categoria pode ter sido apagada em outra aba depois que o formulário abriu.
      if (error instanceof MissingReferenceError) {
        throw new ValidationError(messages.missingCategory, {
          category_id: [messages.missingCategoryField],
        });
      }
      throw error;
    }
  }
}
