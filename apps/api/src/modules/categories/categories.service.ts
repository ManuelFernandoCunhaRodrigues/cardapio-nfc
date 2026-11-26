import {
  adminCategorySchema,
  type ActivationInput,
  type AdminCategory,
  type ReorderInput,
} from '@salgae/core/contracts/admin-api';
import type { categoryFormSchema } from '@salgae/core/schemas/category';
import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';
import type { z } from 'zod';

import { ConflictError } from '../../shared/errors/domain-errors';
import { ReferencedRecordError } from '../../shared/errors/persistence-errors';
import { requireFound, withUniqueSlug } from '../../shared/errors/record-guards';
import { moveInOrder, type OrderableRepository } from '../../shared/ordering/move-in-order';
import { removeMediaIfUnused } from '../media/remove-media-if-unused';

export type CategoryInput = z.infer<typeof categoryFormSchema>;

/** Os métodos que gravam devolvem `false` quando a categoria não existe. */
export interface CategoryRepository extends OrderableRepository {
  isImageInUse(imagePath: string): Promise<boolean>;
  removeImageFiles(filePaths: string[]): Promise<void>;
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
    return withUniqueSlug(() => this.repository.create(input));
  }

  async updateCategory(id: string, input: CategoryInput): Promise<void> {
    requireFound(await withUniqueSlug(() => this.repository.update(id, input)), messages.notFound);
  }

  async setCategoryActive(id: string, { is_active }: ActivationInput): Promise<void> {
    requireFound(await this.repository.setActive(id, is_active), messages.notFound);
  }

  async moveCategory(id: string, { direction }: ReorderInput): Promise<void> {
    await moveInOrder(this.repository, {
      id,
      direction,
      edgeMessage: messages.atListEdge,
      notFoundMessage: messages.notFound,
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const deleted = requireFound(await this.deleteOrExplainProducts(id), messages.notFound);
    if (deleted.imagePath) {
      await removeMediaIfUnused(
        deleted.imagePath,
        {
          isInUse: (path) => this.repository.isImageInUse(path),
          remove: (path) => this.repository.removeImageFiles(mediaObjectPaths(path)),
        },
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
}
