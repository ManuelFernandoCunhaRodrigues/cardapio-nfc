import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AcceptedVideoMimeType } from '@salgae/core/rules/video-limits';

import {
  ConflictError,
  DomainError,
  NotFoundError,
  PayloadTooLargeError,
  ServiceError,
  TimeoutError,
  UnsupportedMediaTypeError,
  ValidationError,
} from '../../../shared/errors/domain-errors';
import { reportServerError } from '../../../shared/observability';
import { removeMediaIfUnused } from '../remove-media-if-unused';
import {
  ACCEPTED_VIDEO_MIME_TYPES,
  VIDEO_FINALIZATION_RESERVE_MS,
  VIDEO_PROCESSING_TIMEOUT_MS,
  VIDEO_RAW_MAX_BYTES,
  VIDEO_ROUTE_BUDGET_MS,
} from './constants';
import type { CompressedVideo, CompressVideoFileOptions } from './compress';
import { VideoCompressionError } from './errors';

export type ProductVideoRecord = { imagePath: string | null; videoPath: string | null };
export type VideoPathChange = { from: string | null; to: string | null };

export interface VideoRepository {
  findProduct(id: string): Promise<ProductVideoRecord | null>;
  replaceVideoPath(id: string, change: VideoPathChange): Promise<boolean>;
  createSignedUploadUrl(path: string): Promise<{ signedUrl: string; token: string }>;
  downloadRaw(path: string): Promise<Blob>;
  uploadVideo(path: string, bytes: Buffer): Promise<void>;
  isVideoInUse(path: string): Promise<boolean>;
  removeVideo(path: string): Promise<void>;
  removeRaw(path: string): Promise<void>;
}

export type VideoCompressor = (options: CompressVideoFileOptions) => Promise<CompressedVideo>;
export type VideoCleanup = (options: {
  cleanupUploads?: boolean;
  productId?: string;
}) => Promise<void>;

const messages = {
  notFound: 'Não foi possível localizar este produto.',
  coverRequired: 'Salve uma foto de capa antes de enviar o vídeo.',
  invalidFormat: 'Vídeo inválido. Escolha um arquivo MP4, MOV ou WebM.',
  invalidVideo: 'Este arquivo não é um vídeo válido. Escolha outro vídeo.',
  tooLarge: 'O vídeo deve ter no máximo 50 MB. Grave em Full HD (1080p), não em 4K.',
  tooLong: 'O vídeo deve ter no máximo 15 segundos.',
  dimensions: 'Grave o vídeo em Full HD (1080p), não em 4K.',
  timeout: 'A compactação demorou mais que o esperado. Tente novamente.',
  noVideo: 'Este produto já não tem vídeo.',
  changedElsewhere:
    'O vídeo deste produto foi alterado em outra aba ou aparelho. Recarregue a página e tente de novo.',
  invalidData: 'Dados do vídeo inválidos.',
  downloadFailed: 'O envio do vídeo não foi concluído. Tente novamente.',
  uploadFailed: 'Não foi possível salvar o vídeo compactado. Tente novamente.',
  compressionFailed:
    'Não foi possível compactar este vídeo. Tente um vídeo mais curto ou gravado em Full HD.',
  prepareFailed: 'Não foi possível preparar o envio do vídeo. Tente novamente.',
};

const NEVER_CANCELLED = new AbortController().signal;
const RAW_PATH_PATTERN =
  /^uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp4|mov|webm)$/i;

function extensionFor(mimeType: AcceptedVideoMimeType): string {
  if (mimeType === 'video/webm') return 'webm';
  if (mimeType === 'video/quicktime') return 'mov';
  return 'mp4';
}

function translateCompressionError(error: unknown): unknown {
  if (error instanceof DomainError) return error;
  if (!(error instanceof VideoCompressionError)) return error;
  if (error.code === 'video_invalid') return new UnsupportedMediaTypeError(messages.invalidVideo);
  if (error.code === 'video_too_large') return new PayloadTooLargeError(messages.tooLarge);
  if (error.code === 'video_too_long') return new ValidationError(messages.tooLong);
  if (error.code === 'video_dimensions_unsupported')
    return new ValidationError(messages.dimensions);
  if (error.code === 'video_timeout') return new TimeoutError(messages.timeout);
  return new ServiceError(messages.compressionFailed);
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');
}

export class VideoService {
  constructor(
    private readonly repository: VideoRepository,
    private readonly compress: VideoCompressor,
    private readonly cleanupOrphans: VideoCleanup = async () => undefined,
  ) {}

  async prepareUpload(
    productId: string,
    mimeType: string,
    size: number,
  ): Promise<{ path: string; signedUrl: string; token: string }> {
    if (!ACCEPTED_VIDEO_MIME_TYPES.includes(mimeType as AcceptedVideoMimeType)) {
      throw new UnsupportedMediaTypeError(messages.invalidFormat);
    }
    if (!Number.isInteger(size) || size <= 0)
      throw new UnsupportedMediaTypeError(messages.invalidFormat);
    if (size > VIDEO_RAW_MAX_BYTES) throw new PayloadTooLargeError(messages.tooLarge);
    const product = await this.requireProduct(productId);
    if (!product.imagePath) throw new ValidationError(messages.coverRequired);
    await this.cleanupOrphans({ cleanupUploads: true, productId });
    const extension = extensionFor(mimeType as AcceptedVideoMimeType);
    const path = `uploads/${productId}_${randomUUID()}.${extension}`;
    try {
      return { path, ...(await this.repository.createSignedUploadUrl(path)) };
    } catch {
      throw new ServiceError(messages.prepareFailed);
    }
  }

  async process(
    productId: string,
    rawPath: string,
    signal: AbortSignal = NEVER_CANCELLED,
  ): Promise<{
    path: string;
    message: string;
    originalBytes: number;
    compressedBytes: number;
  }> {
    this.validateRawPath(productId, rawPath);
    const deadline = Date.now() + VIDEO_ROUTE_BUDGET_MS;
    let workDir: string | undefined;
    let compressed: CompressedVideo | undefined;
    let stagedPath: string | undefined;
    let linked = false;
    try {
      const current = await this.requireProduct(productId);
      if (!current.imagePath) throw new ValidationError(messages.coverRequired);
      const raw = await this.downloadRaw(rawPath);
      if (!raw.size) throw new UnsupportedMediaTypeError(messages.invalidVideo);
      if (raw.size > VIDEO_RAW_MAX_BYTES) throw new PayloadTooLargeError(messages.tooLarge);
      signal.throwIfAborted();
      workDir = await mkdtemp(join(tmpdir(), 'salgae-api-video-'));
      const inputPath = join(workDir, `original.${rawPath.split('.').at(-1) ?? 'bin'}`);
      await writeFile(inputPath, Buffer.from(await raw.arrayBuffer()));
      compressed = await this.compressVideo(inputPath, workDir, deadline);
      signal.throwIfAborted();
      stagedPath = `products/${productId}/${randomUUID()}.mp4`;
      try {
        await this.repository.uploadVideo(stagedPath, await readFile(compressed.outputPath));
      } catch {
        throw new ServiceError(messages.uploadFailed);
      }
      signal.throwIfAborted();
      if (
        !(await this.repository.replaceVideoPath(productId, {
          from: current.videoPath,
          to: stagedPath,
        }))
      ) {
        throw await this.lostReplaceError(productId);
      }
      linked = true;
      await this.removeIfUnused(current.videoPath);
      return {
        path: stagedPath,
        message: `Vídeo compactado e salvo: ${formatMegabytes(compressed.inputBytes)} MB → ${formatMegabytes(compressed.outputBytes)} MB.`,
        originalBytes: compressed.inputBytes,
        compressedBytes: compressed.outputBytes,
      };
    } catch (error) {
      throw translateCompressionError(error);
    } finally {
      if (stagedPath && !linked) await this.removeStaged(stagedPath);
      await this.removeRaw(rawPath);
      if (compressed) await rm(compressed.outputPath, { force: true });
      if (workDir) await rm(workDir, { recursive: true, force: true });
    }
  }

  async remove(productId: string, signal: AbortSignal = NEVER_CANCELLED): Promise<void> {
    const current = await this.requireProduct(productId);
    if (!current.videoPath) throw new ConflictError(messages.noVideo);
    signal.throwIfAborted();
    if (
      !(await this.repository.replaceVideoPath(productId, { from: current.videoPath, to: null }))
    ) {
      throw await this.lostReplaceError(productId);
    }
    await this.removeIfUnused(current.videoPath);
    await this.cleanupOrphans({ productId });
  }

  private validateRawPath(productId: string, rawPath: string): void {
    const match = RAW_PATH_PATTERN.exec(rawPath);
    if (!match || match[1]?.toLowerCase() !== productId.toLowerCase()) {
      throw new ValidationError(messages.invalidData);
    }
  }

  private async compressVideo(inputPath: string, workDir: string, deadline: number) {
    const timeoutMs = Math.min(
      VIDEO_PROCESSING_TIMEOUT_MS,
      deadline - Date.now() - VIDEO_FINALIZATION_RESERVE_MS,
    );
    if (timeoutMs <= 0) throw new VideoCompressionError('video_timeout');
    return this.compress({ inputPath, workDir, timeoutMs });
  }

  private async downloadRaw(path: string): Promise<Blob> {
    try {
      return await this.repository.downloadRaw(path);
    } catch {
      throw new ValidationError(messages.downloadFailed);
    }
  }

  private async requireProduct(id: string): Promise<ProductVideoRecord> {
    const product = await this.repository.findProduct(id);
    if (!product) throw new NotFoundError(messages.notFound);
    return product;
  }

  private async lostReplaceError(id: string): Promise<Error> {
    return (await this.repository.findProduct(id))
      ? new ConflictError(messages.changedElsewhere)
      : new NotFoundError(messages.notFound);
  }

  private async removeIfUnused(path: string | null): Promise<void> {
    await removeMediaIfUnused(
      path,
      {
        isInUse: (current) => this.repository.isVideoInUse(current),
        remove: (current) => this.repository.removeVideo(current),
      },
      'media.video_cleanup_failed',
    );
  }

  private async removeStaged(path: string): Promise<void> {
    try {
      await this.repository.removeVideo(path);
    } catch (error) {
      reportServerError({ event: 'media.video_staged_cleanup_failed', error });
    }
  }

  private async removeRaw(path: string): Promise<void> {
    try {
      await this.repository.removeRaw(path);
    } catch (error) {
      reportServerError({ event: 'media.video_raw_cleanup_failed', error });
    }
  }
}
