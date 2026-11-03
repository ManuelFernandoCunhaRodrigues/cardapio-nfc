import {
  adminHighlightSchema,
  type ActivationInput,
  type AdminHighlight,
  type ReorderInput,
} from '@salgae/core/contracts/admin-api';
import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';
import type { highlightFormSchema } from '@salgae/core/schemas/highlight';
import type { z } from 'zod';

import { NotFoundError } from '../../shared/errors/domain-errors';
import { reportServerError } from '../../shared/observability';
import { moveInOrder, type OrderableRepository } from '../../shared/ordering/move-in-order';

export type HighlightInput = z.infer<typeof highlightFormSchema>;

/** Os métodos que gravam devolvem `false` (ou `null`) quando o destaque não existe. */
export interface HighlightRepository extends OrderableRepository {
  listForAdmin(): Promise<unknown[]>;
  create(input: HighlightInput): Promise<string>;
  update(id: string, input: HighlightInput): Promise<boolean>;
  setActive(id: string, isActive: boolean): Promise<boolean>;
  /** Apaga o destaque e devolve o caminho da imagem que ele usava. */
  delete(id: string): Promise<{ imagePath: string | null } | null>;
  isImageInUse(imagePath: string): Promise<boolean>;
  removeImageFiles(filePaths: string[]): Promise<void>;
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
    this.ensureFound(await this.repository.update(id, input));
  }

  async setHighlightActive(id: string, { is_active }: ActivationInput): Promise<void> {
    this.ensureFound(await this.repository.setActive(id, is_active));
  }

  async moveHighlight(id: string, { direction }: ReorderInput): Promise<void> {
    await moveInOrder(this.repository, { id, direction, edgeMessage: messages.atListEdge });
  }

  async deleteHighlight(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    this.ensureFound(deleted !== null);
    if (deleted?.imagePath) await this.removeImageIfUnused(deleted.imagePath);
  }

  /** O destaque já foi apagado: falhar a limpeza só deixa um arquivo órfão, então só registra. */
  private async removeImageIfUnused(imagePath: string): Promise<void> {
    try {
      if (await this.repository.isImageInUse(imagePath)) return;
      await this.repository.removeImageFiles(mediaObjectPaths(imagePath));
    } catch (error) {
      reportServerError({ event: 'highlight.image_cleanup_failed', error });
    }
  }

  private ensureFound(found: boolean): void {
    if (!found) throw new NotFoundError(messages.notFound);
  }
}
