import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { ConflictError } from '../../../shared/errors/domain-errors';
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
});
