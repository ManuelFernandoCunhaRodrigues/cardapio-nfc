import { describe, expect, it, vi } from 'vitest';

import { ConflictError, NotFoundError } from '../../../shared/errors/domain-errors';
import { RequestCancelledError } from '../../../shared/errors/request-cancelled-error';
import type { CompressedImage } from './image-compressor';
import { ImageService, type ImageRepository, type ImageTarget } from './image.service';

const productId = '11111111-1111-4111-8111-111111111111';
const image = { detail: Buffer.from('detail'), card: Buffer.from('card') };
const file = new File([Buffer.from('jpeg')], 'photo.jpg', { type: 'image/jpeg' });
const compressImage = async () => image;

/**
 * Banco e Storage em memória: um registro com `image_path` e o conjunto de arquivos do bucket.
 * A troca condicional se comporta como o UPDATE ... WHERE image_path = <lido> do repositório real.
 */
class InMemoryImageStore implements ImageRepository {
  readonly files = new Set<string>();
  recordExists = true;
  videoPath: string | null = null;

  constructor(public imagePath: string | null) {
    if (imagePath) this.addFiles(imagePath);
  }

  async findRecord() {
    return this.recordExists ? { imagePath: this.imagePath, videoPath: this.videoPath } : null;
  }

  async replaceImagePath(
    _target: ImageTarget,
    _id: string,
    change: { from: string | null; to: string | null },
  ) {
    if (!this.recordExists || this.imagePath !== change.from) return false;
    this.imagePath = change.to;
    return true;
  }

  async uploadVariants(_target: ImageTarget, basePath: string) {
    this.addFiles(basePath);
  }

  async removeFiles(_target: ImageTarget, paths: string[]) {
    for (const path of paths) this.files.delete(path);
  }

  async isImageInUse(path: string) {
    return this.imagePath === path;
  }

  private addFiles(basePath: string) {
    this.files.add(`${basePath}-detail.webp`);
    this.files.add(`${basePath}-card.webp`);
  }
}

const oldPath = `products/${productId}/old`;
const filesOf = (basePath: string) => [`${basePath}-detail.webp`, `${basePath}-card.webp`];

describe('ImageService', () => {
  it('sobe a nova foto, aponta o registro e só então apaga a antiga', async () => {
    const store = new InMemoryImageStore(oldPath);

    const newPath = await new ImageService(store, compressImage).upload('product', productId, file);

    expect(store.imagePath).toBe(newPath);
    expect([...store.files]).toEqual(filesOf(newPath));
  });

  it('não remove a foto antiga quando outro registro ainda a usa', async () => {
    const store = new InMemoryImageStore(oldPath);
    store.isImageInUse = async () => true;

    const newPath = await new ImageService(store, compressImage).upload('product', productId, file);

    expect(store.files).toEqual(new Set([...filesOf(oldPath), ...filesOf(newPath)]));
  });

  it('guarda a foto da categoria na pasta das categorias', async () => {
    const categoryId = '22222222-2222-4222-8222-222222222222';
    const store = new InMemoryImageStore(null);

    const path = await new ImageService(store, compressImage).upload('category', categoryId, file);

    expect(path.startsWith(`categories/${categoryId}/`)).toBe(true);
  });

  describe('corrida entre requisições da mesma foto', () => {
    it('dois envios simultâneos: o segundo responde 409 e apaga só o que ele subiu', async () => {
      const store = new InMemoryImageStore(oldPath);
      let releaseFirst!: () => void;
      const firstCompression = new Promise<void>((resolve) => (releaseFirst = resolve));
      const service = new ImageService(store, compressImage);
      const slowService = new ImageService(store, async (): Promise<CompressedImage> => {
        await firstCompression;
        return image;
      });

      // As duas leem `old`; a rápida vincula primeiro, a lenta perde a troca condicional.
      const slow = slowService.upload('product', productId, file);
      const fastPath = await service.upload('product', productId, file);
      releaseFirst();

      await expect(slow).rejects.toThrow(ConflictError);
      await expect(slow).rejects.toThrow('alterada em outra aba');
      expect(store.imagePath).toBe(fastPath);
      expect([...store.files]).toEqual(filesOf(fastPath));
    });

    it('envio contra remoção: o envio que perdeu não deixa arquivo órfão', async () => {
      const store = new InMemoryImageStore(oldPath);
      let releaseUpload!: () => void;
      const uploadCompression = new Promise<void>((resolve) => (releaseUpload = resolve));
      const uploadService = new ImageService(store, async () => {
        await uploadCompression;
        return image;
      });

      const upload = uploadService.upload('product', productId, file);
      await new ImageService(store, compressImage).remove('product', productId);
      releaseUpload();

      await expect(upload).rejects.toBeInstanceOf(ConflictError);
      expect(store.imagePath).toBeNull();
      expect(store.files.size).toBe(0);
    });

    it('remoção depois de outra troca responde 409 sem apagar a foto nova', async () => {
      const store = new InMemoryImageStore(oldPath);
      const service = new ImageService(store, compressImage);
      const staleRead = store.findRecord.bind(store);
      store.findRecord = async () => {
        const record = await staleRead();
        store.imagePath = `products/${productId}/from-other-tab`;
        return record;
      };

      await expect(service.remove('product', productId)).rejects.toBeInstanceOf(ConflictError);
      expect(store.imagePath).toBe(`products/${productId}/from-other-tab`);
    });
  });

  it('responde 404 e apaga a foto nova quando o item some antes do vínculo', async () => {
    const store = new InMemoryImageStore(oldPath);
    const service = new ImageService(store, async () => {
      store.recordExists = false;
      return image;
    });

    await expect(service.upload('product', productId, file)).rejects.toEqual(
      new NotFoundError('Não foi possível localizar este produto.'),
    );
    expect([...store.files]).toEqual(filesOf(oldPath));
  });

  it('repassa a falha inesperada do vínculo e apaga a foto nova', async () => {
    const store = new InMemoryImageStore(oldPath);
    const failure = new Error('policy quebrada');
    store.replaceImagePath = async () => {
      throw failure;
    };

    await expect(
      new ImageService(store, compressImage).upload('product', productId, file),
    ).rejects.toBe(failure);
    expect(store.imagePath).toBe(oldPath);
    expect([...store.files]).toEqual(filesOf(oldPath));
  });

  describe('requisição cancelada pelo timeout', () => {
    it('cancelada durante a compressão: não sobe nem troca nada', async () => {
      const store = new InMemoryImageStore(oldPath);
      const controller = new AbortController();
      const uploadVariants = vi.spyOn(store, 'uploadVariants');
      const service = new ImageService(store, async () => {
        controller.abort(new RequestCancelledError());
        return image;
      });

      await expect(
        service.upload('product', productId, file, controller.signal),
      ).rejects.toBeInstanceOf(RequestCancelledError);
      expect(uploadVariants).not.toHaveBeenCalled();
      expect(store.imagePath).toBe(oldPath);
    });

    it('cancelada durante o envio ao Storage: apaga o que subiu e mantém a foto antiga', async () => {
      const store = new InMemoryImageStore(oldPath);
      const controller = new AbortController();
      const upload = store.uploadVariants.bind(store);
      store.uploadVariants = async (target, basePath) => {
        await upload(target, basePath);
        controller.abort(new RequestCancelledError());
      };

      await expect(
        new ImageService(store, compressImage).upload(
          'product',
          productId,
          file,
          controller.signal,
        ),
      ).rejects.toBeInstanceOf(RequestCancelledError);
      expect(store.imagePath).toBe(oldPath);
      expect([...store.files]).toEqual(filesOf(oldPath));
    });

    it('remoção cancelada não desvincula a foto', async () => {
      const store = new InMemoryImageStore(oldPath);
      const controller = new AbortController();
      controller.abort(new RequestCancelledError());

      await expect(
        new ImageService(store, compressImage).remove('product', productId, controller.signal),
      ).rejects.toBeInstanceOf(RequestCancelledError);
      expect(store.imagePath).toBe(oldPath);
      expect(store.files.size).toBe(2);
    });
  });

  it('avisa quando a categoria já não tem foto para remover', async () => {
    const service = new ImageService(new InMemoryImageStore(null), compressImage);

    await expect(service.remove('category', productId)).rejects.toThrow(
      'Esta categoria já não tem foto.',
    );
  });

  it('recusa remover a capa de produto que tem vídeo', async () => {
    const store = new InMemoryImageStore(oldPath);
    store.videoPath = `products/${productId}/video.mp4`;

    await expect(
      new ImageService(store, compressImage).remove('product', productId),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(store.imagePath).toBe(oldPath);
  });
});
