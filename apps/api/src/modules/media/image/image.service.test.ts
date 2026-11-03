import { describe, expect, it, vi } from 'vitest';

import { ImageService, type ImageRepository } from './image.service';

const productId = '11111111-1111-4111-8111-111111111111';
const image = { detail: Buffer.from('detail'), card: Buffer.from('card') };

function fakeRepository(overrides: Partial<ImageRepository> = {}): ImageRepository {
  return {
    findRecord: async () => ({ imagePath: 'products/old/image', videoPath: null }),
    setImagePath: async () => true,
    uploadVariants: async () => undefined,
    removeFiles: async () => undefined,
    isImageInUse: async () => false,
    ...overrides,
  };
}

const file = new File([Buffer.from('jpeg')], 'photo.jpg', { type: 'image/jpeg' });

describe('ImageService', () => {
  it('sobe a nova foto, aponta o registro e só então apaga a antiga', async () => {
    const calls: string[] = [];
    const repository = fakeRepository({
      uploadVariants: async () => {
        calls.push('upload-new');
      },
      setImagePath: async () => {
        calls.push('update-record');
        return true;
      },
      isImageInUse: async () => {
        calls.push('check-old-references');
        return false;
      },
      removeFiles: async () => {
        calls.push('remove-old');
      },
    });

    await new ImageService(repository, async () => image).upload('product', productId, file);

    expect(calls).toEqual(['upload-new', 'update-record', 'check-old-references', 'remove-old']);
  });

  it('remove a foto nova e preserva a antiga quando o vínculo falha', async () => {
    const removedPaths: string[][] = [];
    const repository = fakeRepository({
      setImagePath: async () => {
        throw new Error('database unavailable');
      },
      removeFiles: async (_target, paths) => {
        removedPaths.push(paths);
      },
    });

    await expect(
      new ImageService(repository, async () => image).upload('product', productId, file),
    ).rejects.toThrow('A foto anterior foi mantida');
    expect(removedPaths).toHaveLength(1);
    expect(removedPaths[0]?.every((path) => path.includes(productId))).toBe(true);
  });

  it('não remove a foto antiga quando outro registro ainda a usa', async () => {
    const removeFiles = vi.fn(async () => undefined);

    await new ImageService(
      fakeRepository({ isImageInUse: async () => true, removeFiles }),
      async () => image,
    ).upload('product', productId, file);

    expect(removeFiles).not.toHaveBeenCalled();
  });
});
