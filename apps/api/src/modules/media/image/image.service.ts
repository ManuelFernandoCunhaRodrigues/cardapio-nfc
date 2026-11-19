import { randomUUID } from 'node:crypto';

import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';

import {
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from '../../../shared/errors/domain-errors';
import { reportServerError } from '../../../shared/observability';
import {
  ImageResolutionTooHighError,
  ImageTooLargeError,
  ImageTooSmallError,
  InvalidImageError,
  UnsupportedImageFormatError,
  type CompressedImage,
} from './image-compressor';
import { removeMediaIfUnused } from '../remove-media-if-unused';

export type ImageTarget = 'product' | 'highlight' | 'category';

type MediaRecord = { imagePath: string | null; videoPath?: string | null };

/** Troca condicional: só grava `to` se o registro ainda aponta para `from`. */
export type ImagePathChange = { from: string | null; to: string | null };

export interface ImageRepository {
  findRecord(target: ImageTarget, id: string): Promise<MediaRecord | null>;
  /** Devolve `false` quando o registro sumiu ou a foto já foi trocada por outra requisição. */
  replaceImagePath(target: ImageTarget, id: string, change: ImagePathChange): Promise<boolean>;
  uploadVariants(target: ImageTarget, basePath: string, image: CompressedImage): Promise<void>;
  removeFiles(target: ImageTarget, paths: string[]): Promise<void>;
  isImageInUse(imagePath: string): Promise<boolean>;
}

export type ImageCompressor = (input: Buffer) => Promise<CompressedImage>;

const messages = {
  invalid: 'Este arquivo não é uma imagem válida. Escolha outra foto.',
  tooSmall: 'Escolha uma foto com pelo menos 400 px no menor lado.',
  unsupportedFormat:
    'Fotos HEIC/HEIF (padrão do iPhone) não são aceitas. Envie a foto em JPEG, PNG ou WebP.',
  resolutionTooHigh: 'A foto tem pixels demais (máximo de 40 megapixels). Reduza e envie de novo.',
  tooLarge:
    'Não foi possível deixar esta foto com menos de 1 MB. Recorte a imagem ou escolha outra foto.',
  productHasVideo: 'Remova o vídeo antes de remover a foto de capa.',
  changedElsewhere:
    'A foto deste item foi alterada em outra aba ou aparelho. Recarregue a página e tente de novo.',
};

const NEVER_CANCELLED = new AbortController().signal;

const targetSettings: Record<ImageTarget, { folder: string; notFound: string; noImage: string }> = {
  product: {
    folder: 'products',
    notFound: 'Não foi possível localizar este produto.',
    noImage: 'Este produto já não tem foto.',
  },
  highlight: {
    folder: 'highlights',
    notFound: 'Não foi possível localizar este destaque.',
    noImage: 'Este destaque já não tem foto.',
  },
  category: {
    folder: 'categories',
    notFound: 'Não foi possível localizar esta categoria.',
    noImage: 'Esta categoria já não tem foto.',
  },
};

function translateCompressionError(error: unknown): unknown {
  if (error instanceof ImageTooSmallError) return new ValidationError(messages.tooSmall);
  if (error instanceof InvalidImageError) return new ValidationError(messages.invalid);
  if (error instanceof UnsupportedImageFormatError) {
    return new UnsupportedMediaTypeError(messages.unsupportedFormat);
  }
  if (error instanceof ImageResolutionTooHighError) {
    return new PayloadTooLargeError(messages.resolutionTooHigh);
  }
  if (error instanceof ImageTooLargeError) return new PayloadTooLargeError(messages.tooLarge);
  return error;
}

export class ImageService {
  constructor(
    private readonly repository: ImageRepository,
    private readonly compress: ImageCompressor,
  ) {}

  /**
   * Sobe a foto nova, vincula ao registro e só então apaga a antiga. Se a requisição for cancelada
   * (timeout) antes do vínculo, desiste e apaga o que subiu; depois do vínculo, vai até o fim.
   */
  async upload(
    target: ImageTarget,
    id: string,
    file: File,
    signal: AbortSignal = NEVER_CANCELLED,
  ): Promise<string> {
    const current = await this.requireRecord(target, id);
    const compressed = await this.compressFile(file);
    signal.throwIfAborted();
    const basePath = `${targetSettings[target].folder}/${id}/${randomUUID()}`;
    await this.repository.uploadVariants(target, basePath, compressed);
    await this.linkStaged(target, id, { from: current.imagePath, to: basePath }, signal);
    await this.removeIfUnused(target, current.imagePath);
    return basePath;
  }

  async remove(
    target: ImageTarget,
    id: string,
    signal: AbortSignal = NEVER_CANCELLED,
  ): Promise<void> {
    const current = await this.requireRecord(target, id);
    if (target === 'product' && current.videoPath)
      throw new ConflictError(messages.productHasVideo);
    if (!current.imagePath) throw new ConflictError(targetSettings[target].noImage);
    signal.throwIfAborted();
    const change = { from: current.imagePath, to: null };
    if (!(await this.repository.replaceImagePath(target, id, change))) {
      throw await this.lostReplaceError(target, id);
    }
    await this.removeIfUnused(target, current.imagePath);
  }

  /** Qualquer falha antes ou durante o vínculo apaga os arquivos novos: nada fica órfão. */
  private async linkStaged(
    target: ImageTarget,
    id: string,
    change: ImagePathChange & { to: string },
    signal: AbortSignal,
  ): Promise<void> {
    let linked: boolean;
    try {
      signal.throwIfAborted();
      linked = await this.repository.replaceImagePath(target, id, change);
    } catch (error) {
      // O errorHandler registra e responde 500 (ou 504, se foi o cancelamento).
      await this.removeStaged(target, change.to);
      throw error;
    }
    if (!linked) {
      await this.removeStaged(target, change.to);
      throw await this.lostReplaceError(target, id);
    }
  }

  /** A troca condicional não afetou linha: ou o registro sumiu, ou outra aba trocou a foto antes. */
  private async lostReplaceError(target: ImageTarget, id: string): Promise<Error> {
    const record = await this.repository.findRecord(target, id);
    return record
      ? new ConflictError(messages.changedElsewhere)
      : new NotFoundError(targetSettings[target].notFound);
  }

  private async compressFile(file: File): Promise<CompressedImage> {
    try {
      return await this.compress(Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      throw translateCompressionError(error);
    }
  }

  private async requireRecord(target: ImageTarget, id: string): Promise<MediaRecord> {
    const record = await this.repository.findRecord(target, id);
    if (!record) throw new NotFoundError(targetSettings[target].notFound);
    return record;
  }

  private async removeStaged(target: ImageTarget, path: string): Promise<void> {
    try {
      await this.repository.removeFiles(target, mediaObjectPaths(path));
    } catch (error) {
      reportServerError({ event: 'image.staged_cleanup_failed', error });
    }
  }

  private async removeIfUnused(target: ImageTarget, path: string | null): Promise<void> {
    await removeMediaIfUnused(
      path,
      {
        isInUse: (current) => this.repository.isImageInUse(current),
        remove: (current) => this.repository.removeFiles(target, mediaObjectPaths(current)),
      },
      'image.previous_cleanup_failed',
    );
  }
}
