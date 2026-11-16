import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { ConflictError } from '../../../shared/errors/domain-errors';
import { mapErrorToHttp } from '../../../shared/errors/http-error-mapper';
import { VideoCompressionError, type VideoErrorCode } from './errors';
import { VideoService, type VideoRepository } from './video.service';

const productId = '11111111-1111-4111-8111-111111111111';
const rawPath = `uploads/${productId}_22222222-2222-4222-8222-222222222222.mp4`;
const previousPath = `products/${productId}/anterior.mp4`;

function fakeRepository(overrides: Partial<VideoRepository> = {}): VideoRepository {
  return {
    findProduct: async () => ({ imagePath: `products/${productId}/capa`, videoPath: previousPath }),
    replaceVideoPath: vi.fn(async () => true),
    createSignedUploadUrl: async () => ({ signedUrl: '/signed', token: 'token' }),
    downloadRaw: async () => new Blob([Buffer.from('video bruto')]),
    uploadVideo: vi.fn(async () => undefined),
    isVideoInUse: async () => false,
    removeVideo: vi.fn(async () => undefined),
    removeRaw: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function fakeCompressor({ workDir }: { workDir?: string }) {
  const outputPath = join(workDir!, 'compactado.mp4');
  await writeFile(outputPath, Buffer.from('video compactado'));
  return {
    outputPath,
    inputBytes: 10_000_000,
    outputBytes: 2_000_000,
    duration: 10,
    width: 1_280,
    height: 720,
    fps: 30,
    hdrConverted: false,
    usedFallback: false,
    elapsedMs: 1_000,
  };
}

describe('VideoService', () => {
  it('vincula o vídeo compactado por troca condicional e apaga o anterior sem uso', async () => {
    const repository = fakeRepository();

    const result = await new VideoService(repository, fakeCompressor).process(productId, rawPath);

    expect(result.path).toMatch(new RegExp(`^products/${productId}/.+\\.mp4$`));
    expect(repository.uploadVideo).toHaveBeenCalledWith(result.path, expect.any(Buffer));
    expect(repository.replaceVideoPath).toHaveBeenCalledWith(productId, {
      from: previousPath,
      to: result.path,
    });
    expect(repository.removeVideo).toHaveBeenCalledWith(previousPath);
    expect(repository.removeRaw).toHaveBeenCalledWith(rawPath);
  });

  it('responde conflito na corrida, apaga o vídeo preparado e preserva o anterior', async () => {
    const removeVideo = vi.fn(async () => undefined);
    const repository = fakeRepository({
      replaceVideoPath: async () => false,
      removeVideo,
    });

    await expect(
      new VideoService(repository, fakeCompressor).process(productId, rawPath),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(removeVideo).toHaveBeenCalledTimes(1);
    expect(removeVideo).toHaveBeenCalledWith(expect.stringMatching(/\.mp4$/));
    expect(removeVideo).not.toHaveBeenCalledWith(previousPath);
    expect(repository.removeRaw).toHaveBeenCalledWith(rawPath);
  });

  it.each([
    [
      'a compactação falha',
      {},
      async () => {
        throw new VideoCompressionError('video_compress_failed');
      },
    ],
    ['o produto some', { findProduct: async () => null }, fakeCompressor],
    [
      'a foto de capa some',
      { findProduct: async () => ({ imagePath: null, videoPath: previousPath }) },
      fakeCompressor,
    ],
  ])('apaga o bruto quando %s', async (_label, overrides, compressor) => {
    const removeRaw = vi.fn(async () => undefined);
    const repository = fakeRepository({ ...overrides, removeRaw });

    await expect(
      new VideoService(repository, compressor).process(productId, rawPath),
    ).rejects.toBeInstanceOf(Error);

    expect(removeRaw).toHaveBeenCalledWith(rawPath);
  });

  it('mantém o vídeo anterior quando outro produto ainda o usa', async () => {
    const removeVideo = vi.fn(async () => undefined);
    const repository = fakeRepository({ isVideoInUse: async () => true, removeVideo });

    await new VideoService(repository, fakeCompressor).process(productId, rawPath);

    expect(removeVideo).not.toHaveBeenCalledWith(previousPath);
  });

  it('mantém o vídeo anterior quando a checagem de referência falha', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const removeVideo = vi.fn(async () => undefined);
    const repository = fakeRepository({
      isVideoInUse: async () => {
        throw new Error('banco indisponível');
      },
      removeVideo,
    });

    await new VideoService(repository, fakeCompressor).process(productId, rawPath);

    expect(removeVideo).not.toHaveBeenCalledWith(previousPath);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('media.video_cleanup_failed'));
    log.mockRestore();
  });

  it('remove responde conflito e mantém o arquivo quando a troca afeta zero linhas', async () => {
    const removeVideo = vi.fn(async () => undefined);
    const repository = fakeRepository({ replaceVideoPath: async () => false, removeVideo });

    await expect(
      new VideoService(repository, fakeCompressor).remove(productId),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(removeVideo).not.toHaveBeenCalled();
  });

  it('não espera a faxina de órfãos para responder ao DELETE', async () => {
    const cleanup = vi.fn(() => new Promise<void>(() => undefined));

    await new VideoService(fakeRepository(), fakeCompressor, cleanup).remove(productId);

    expect(cleanup).toHaveBeenCalledWith({ productId });
  });

  it.each([
    ['video_timeout', 504],
    ['video_too_long', 400],
    ['video_dimensions_unsupported', 400],
    ['video_too_large', 413],
    ['video_invalid', 415],
    ['video_compress_failed', 500],
    ['video_output_too_large', 500],
  ] satisfies Array<[VideoErrorCode, number]>)('mapeia %s para HTTP %i', async (code, status) => {
    const service = new VideoService(fakeRepository(), async () => {
      throw new VideoCompressionError(code);
    });

    const error = await service.process(productId, rawPath).catch((caught: unknown) => caught);

    expect(mapErrorToHttp(error as Error).status).toBe(status);
  });

  it('limita o ffmpeg ao tempo restante da rota', async () => {
    const compress = vi.fn(fakeCompressor);
    const now = vi
      .fn()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_000)
      .mockReturnValue(101_000);

    await new VideoService(fakeRepository(), compress, async () => undefined, { now }).process(
      productId,
      rawPath,
    );

    expect(compress).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 50_000 }));
  });

  it('recusa o caminho bruto emitido para outro produto', async () => {
    const removeRaw = vi.fn(async () => undefined);
    const repository = fakeRepository({ removeRaw });
    const otherPath =
      'uploads/99999999-9999-4999-8999-999999999999_22222222-2222-4222-8222-222222222222.mp4';

    const error = await new VideoService(repository, fakeCompressor)
      .process(productId, otherPath)
      .catch((caught: unknown) => caught);

    expect(mapErrorToHttp(error as Error).status).toBe(400);
    expect(removeRaw).not.toHaveBeenCalled();
  });

  it('interrompe download que excede o limite e apaga o bruto', async () => {
    const removeRaw = vi.fn(async () => undefined);
    const repository = fakeRepository({
      downloadRaw: () => new Promise<Blob>(() => undefined),
      removeRaw,
    });
    const service = new VideoService(repository, fakeCompressor, async () => undefined, {
      downloadTimeoutMs: 5,
    });

    const error = await service.process(productId, rawPath).catch((caught: unknown) => caught);

    expect(mapErrorToHttp(error as Error).status).toBe(504);
    expect(removeRaw).toHaveBeenCalledWith(rawPath);
  });

  it('interrompe upload que excede o limite e limpa o bruto e o vídeo preparado', async () => {
    const removeRaw = vi.fn(async () => undefined);
    const removeVideo = vi.fn(async () => undefined);
    const repository = fakeRepository({
      uploadVideo: () => new Promise<void>(() => undefined),
      removeRaw,
      removeVideo,
    });
    const service = new VideoService(repository, fakeCompressor, async () => undefined, {
      uploadTimeoutMs: 5,
    });

    const error = await service.process(productId, rawPath).catch((caught: unknown) => caught);

    expect(mapErrorToHttp(error as Error).status).toBe(504);
    expect(removeRaw).toHaveBeenCalledWith(rawPath);
    expect(removeVideo).toHaveBeenCalledWith(expect.stringMatching(/\.mp4$/));
  });
});
