import { randomUUID } from 'node:crypto';

import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/domain-errors';
import { reportServerError } from '../../../shared/observability';
import { ImageTooSmallError, InvalidImageError, type CompressedImage } from './image-compressor';

export type ImageTarget = 'product' | 'highlight';

type MediaRecord = { imagePath: string | null; videoPath?: string | null };

export interface ImageRepository {
  findRecord(target: ImageTarget, id: string): Promise<MediaRecord | null>;
  setImagePath(target: ImageTarget, id: string, imagePath: string | null): Promise<boolean>;
  uploadVariants(target: ImageTarget, basePath: string, image: CompressedImage): Promise<void>;
  removeFiles(target: ImageTarget, paths: string[]): Promise<void>;
  isImageInUse(imagePath: string): Promise<boolean>;
}

export type ImageCompressor = (input: Buffer) => Promise<CompressedImage>;

const messages = {
  productNotFound: 'Não foi possível localizar este produto.',
  highlightNotFound: 'Não foi possível localizar este destaque.',
  missing: 'Escolha uma foto antes de enviar.',
  invalid: 'Este arquivo não é uma imagem válida. Escolha outra foto.',
  tooSmall: 'Escolha uma foto com pelo menos 400 px no menor lado.',
  productHasVideo: 'Remova o vídeo antes de remover a foto de capa.',
  noProductImage: 'Este produto já não tem foto.',
  noHighlightImage: 'Este destaque já não tem foto.',
  linkFailed:
    'A foto foi validada, mas não pôde ser vinculada ao item. A foto anterior foi mantida.',
};

const targetFolder = (target: ImageTarget) => (target === 'product' ? 'products' : 'highlights');

export class ImageService {
  constructor(
    private readonly repository: ImageRepository,
    private readonly compress: ImageCompressor,
  ) {}

  async upload(target: ImageTarget, id: string, file: File): Promise<string> {
    if (!file.size) throw new ValidationError(messages.missing);
    const current = await this.requireRecord(target, id);
    const compressed = await this.compressFile(file);
    const basePath = `${targetFolder(target)}/${id}/${randomUUID()}`;
    await this.repository.uploadVariants(target, basePath, compressed);
    try {
      if (!(await this.repository.setImagePath(target, id, basePath)))
        throw new Error('record_missing');
    } catch {
      await this.removeStaged(target, basePath);
      throw new ConflictError(messages.linkFailed);
    }
    await this.removeIfUnused(target, current.imagePath);
    return basePath;
  }

  async remove(target: ImageTarget, id: string): Promise<void> {
    const current = await this.requireRecord(target, id);
    if (target === 'product' && current.videoPath)
      throw new ConflictError(messages.productHasVideo);
    if (!current.imagePath) {
      throw new ConflictError(
        target === 'product' ? messages.noProductImage : messages.noHighlightImage,
      );
    }
    if (!(await this.repository.setImagePath(target, id, null)))
      throw new NotFoundError(this.notFound(target));
    await this.removeIfUnused(target, current.imagePath);
  }

  private async compressFile(file: File): Promise<CompressedImage> {
    try {
      return await this.compress(Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      if (error instanceof ImageTooSmallError) throw new ValidationError(messages.tooSmall);
      if (error instanceof InvalidImageError) throw new ValidationError(messages.invalid);
      throw error;
    }
  }

  private async requireRecord(target: ImageTarget, id: string): Promise<MediaRecord> {
    const record = await this.repository.findRecord(target, id);
    if (!record) throw new NotFoundError(this.notFound(target));
    return record;
  }

  private notFound(target: ImageTarget): string {
    return target === 'product' ? messages.productNotFound : messages.highlightNotFound;
  }

  private async removeStaged(target: ImageTarget, path: string): Promise<void> {
    try {
      await this.repository.removeFiles(target, mediaObjectPaths(path));
    } catch (error) {
      reportServerError({ event: 'image.staged_cleanup_failed', error });
    }
  }

  private async removeIfUnused(target: ImageTarget, path: string | null): Promise<void> {
    if (!path) return;
    try {
      if (await this.repository.isImageInUse(path)) return;
      await this.repository.removeFiles(target, mediaObjectPaths(path));
    } catch (error) {
      reportServerError({ event: 'image.previous_cleanup_failed', error });
    }
  }
}
