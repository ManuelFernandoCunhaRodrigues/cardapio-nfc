import {
  adminCategorySchema,
  type ActivationInput,
  type AdminCategory,
  type ReorderInput,
} from '@salgae/core/contracts/admin-api';
import type { categoryFormSchema } from '@salgae/core/schemas/category';
import type { z } from 'zod';

import { ConflictError, NotFoundError } from '../../shared/errors/domain-errors';
import {
  ReferencedRecordError,
  UniqueViolationError,
} from '../../shared/errors/persistence-errors';
import { moveInOrder, type OrderableRepository } from '../../shared/ordering/move-in-order';
import {
  removeImageIfUnused,
  type DeletedRecordImageStore,
} from '../media/image/remove-image-if-unused';

export type CategoryInput = z.infer<typeof categoryFormSchema>;

/** Os métodos que gravam devolvem `false` quando a categoria não existe. */
export interface CategoryRepository extends OrderableRepository, DeletedRecordImageStore {
  listForAdmin(): Promise<unknown[]>;
  /** Lança `UniqueViolationError` quando o endereço curto já existe. */
  create(input: CategoryInput): Promise<string>;
  /** Lança `UniqueViolationError` quando o endereço curto já existe. */
  update(id: string, input: CategoryInput): Promise<boolean>;
  setActive(id: string, isActive: boolean): Promise<boolean>;
  /**
   * Devolve a foto da categoria apagada, ou `null` quando a categoria não existe.
   * Lança `ReferencedRecordError` quando ainda há produtos na categoria.
   */
  delete(id: string): Promise<{ imagePath: string | null } | null>;
}

const messages = {
  notFound: 'Categoria não encontrada.',
  slugInUse: 'Esse endereço curto já está em uso. Escolha outro.',
  slugInUseField: 'Esse endereço curto já está em uso.',
  atListEdge: 'Esta categoria já está no limite da lista.',
  hasProducts:
    'Esta categoria possui produtos vinculados. Mova os produtos para outra categoria ou desative-a.',
};

export class CategoriesService {
  constructor(private readonly repository: CategoryRepository) {}

  async listCategories(): Promise<AdminCategory[]> {
    return adminCategorySchema.array().parse(await this.repository.listForAdmin());
  }

  async createCategory(input: CategoryInput): Promise<string> {
    return this.withUniqueSlug(() => this.repository.create(input));
  }

  async updateCategory(id: string, input: CategoryInput): Promise<void> {
    this.ensureFound(await this.withUniqueSlug(() => this.repository.update(id, input)));
  }

  async setCategoryActive(id: string, { is_active }: ActivationInput): Promise<void> {
    this.ensureFound(await this.repository.setActive(id, is_active));
  }

  async moveCategory(id: string, { direction }: ReorderInput): Promise<void> {
    await moveInOrder(this.repository, { id, direction, edgeMessage: messages.atListEdge });
  }

  async deleteCategory(id: string): Promise<void> {
    const deleted = await this.deleteOrExplainProducts(id);
    this.ensureFound(deleted !== null);
    if (deleted?.imagePath) {
      await removeImageIfUnused(
        this.repository,
        deleted.imagePath,
        'category.image_cleanup_failed',
      );
    }
  }

  private async deleteOrExplainProducts(id: string) {
    try {
      return await this.repository.delete(id);
    } catch (error) {
      if (error instanceof ReferencedRecordError) throw new ConflictError(messages.hasProducts);
      throw error;
    }
  }

  private async withUniqueSlug<T>(save: () => Promise<T>): Promise<T> {
    try {
      return await save();
    } catch (error) {
      if (error instanceof UniqueViolationError) {
        throw new ConflictError(messages.slugInUse, { slug: [messages.slugInUseField] });
      }
      throw error;
    }
  }

  private ensureFound(found: boolean): void {
    if (!found) throw new NotFoundError(messages.notFound);
  }
}
