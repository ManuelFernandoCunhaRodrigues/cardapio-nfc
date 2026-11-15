import {
  adminHighlightSchema,
  type ActivationInput,
  type AdminHighlight,
  type ReorderInput,
} from '@salgae/core/contracts/admin-api';
import type { highlightFormSchema } from '@salgae/core/schemas/highlight';
import type { z } from 'zod';

import { requireFound } from '../../shared/errors/record-guards';
import { moveInOrder, type OrderableRepository } from '../../shared/ordering/move-in-order';
import {
  removeImageIfUnused,
  type DeletedRecordImageStore,
} from '../media/image/remove-image-if-unused';

export type HighlightInput = z.infer<typeof highlightFormSchema>;

/** Os métodos que gravam devolvem `false` (ou `null`) quando o destaque não existe. */
export interface HighlightRepository extends OrderableRepository, DeletedRecordImageStore {
  listForAdmin(): Promise<unknown[]>;
  create(input: HighlightInput): Promise<string>;
  update(id: string, input: HighlightInput): Promise<boolean>;
  setActive(id: string, isActive: boolean): Promise<boolean>;
  /** Apaga o destaque e devolve o caminho da imagem que ele usava. */
  delete(id: string): Promise<{ imagePath: string | null } | null>;
}

const messages = {
  notFound: 'Destaque não encontrado.',
  atListEdge: 'Este destaque já está no limite da lista.',
};

export class HighlightsService {
  constructor(private readonly repository: HighlightRepository) {}

  async listHighlights(): Promise<AdminHighlight[]> {
    return adminHighlightSchema.array().parse(await this.repository.listForAdmin());
  }

  async createHighlight(input: HighlightInput): Promise<string> {
    return this.repository.create(input);
  }

  async updateHighlight(id: string, input: HighlightInput): Promise<void> {
    requireFound(await this.repository.update(id, input), messages.notFound);
  }

  async setHighlightActive(id: string, { is_active }: ActivationInput): Promise<void> {
    requireFound(await this.repository.setActive(id, is_active), messages.notFound);
  }

  async moveHighlight(id: string, { direction }: ReorderInput): Promise<void> {
    await moveInOrder(this.repository, {
      id,
      direction,
      edgeMessage: messages.atListEdge,
      notFoundMessage: messages.notFound,
    });
  }

  async deleteHighlight(id: string): Promise<void> {
    const deleted = requireFound(await this.repository.delete(id), messages.notFound);
    if (deleted.imagePath) {
      await removeImageIfUnused(
        this.repository,
        deleted.imagePath,
        'highlight.image_cleanup_failed',
      );
    }
  }
}
