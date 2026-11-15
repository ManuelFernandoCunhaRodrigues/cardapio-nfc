import { Hono } from 'hono';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../shared/http/error-handler';
import { requestTimeoutMiddleware } from '../../shared/http/request-timeout';
import {
  MissingReferenceError,
  UniqueViolationError,
} from '../../shared/errors/persistence-errors';
import type { AppHonoEnv } from '../../shared/types';
import { adminRequest, fakeAdminClients } from '../../test-support/admin-clients';
import { itRequiresAdmin } from '../../test-support/admin-only-routes';
import { createImageController } from '../media/image/image.controller';
import { createVideoController } from '../media/video/video.controller';
import { VideoService, type VideoRepository } from '../media/video/video.service';
import {
  ImageResolutionTooHighError,
  ImageTooLargeError,
  UnsupportedImageFormatError,
} from '../media/image/image-compressor';
import {
  ImageService,
  type ImageCompressor,
  type ImageRepository,
} from '../media/image/image.service';
import { createProductsController } from './products.controller';
import { createProductsRoutes } from './products.routes';
import { ProductsService, type ProductRepository } from './products.service';

const productId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const validInput = {
  name: 'Coxinha',
  description: '',
  price: 'R$ 8,90',
  category_id: categoryId,
  badge: null,
  is_active: true,
  is_available: true,
};

function fakeProductRepository(overrides: Partial<ProductRepository> = {}): ProductRepository {
  return {
    listForAdmin: async () => [],
    create: vi.fn(async () => productId),
    update: vi.fn(async () => true),
    findCategoryId: async () => categoryId,
    setSituation: vi.fn(async () => true),
    listSortOrders: async () => [],
    swapSortOrders: async () => undefined,
    delete: vi.fn(async () => ({ imagePath: null, videoPath: null })),
    isImageInUse: async () => false,
    isVideoInUse: async () => false,
    removeImageFiles: async () => undefined,
    removeVideoFile: async () => undefined,
    ...overrides,
  };
}

function fakeImageRepository(): ImageRepository {
  return {
    findRecord: async () => ({ imagePath: null, videoPath: null }),
    replaceImagePath: async () => true,
    uploadVariants: async () => undefined,
    removeFiles: async () => undefined,
    isImageInUse: async () => false,
  };
}

function fakeVideoRepository(): VideoRepository {
  return {
    findProduct: async () => ({ imagePath: 'products/id/cover', videoPath: null }),
    replaceVideoPath: async () => true,
    createSignedUploadUrl: async () => ({ signedUrl: '/signed', token: 'token' }),
    downloadRaw: async () => new Blob([Buffer.from('video')]),
    uploadVideo: async () => undefined,
    isVideoInUse: async () => false,
    removeVideo: async () => undefined,
    removeRaw: async () => undefined,
  };
}

const compressedImage: ImageCompressor = async () => ({
  detail: Buffer.from('detail'),
  card: Buffer.from('card'),
});

function testApp(
  productRepository = fakeProductRepository(),
  compress = compressedImage,
  videos = new VideoService(fakeVideoRepository(), async () => {
    throw new Error('compactação não esperada neste teste');
  }),
) {
  const products = new ProductsService(productRepository);
  const images = new ImageService(fakeImageRepository(), compress);
  const app = new Hono<AppHonoEnv>();
  app.onError(errorHandler);
  app.route(
    '/v1/admin/products',
    createProductsRoutes(
      fakeAdminClients(),
      createProductsController(() => products),
      createImageController('product', () => images),
      createVideoController(() => videos),
    ),
  );
  return app;
}

function imageRequest(file: File): RequestInit {
  const body = new FormData();
  body.set('image', file);
  return { method: 'POST', headers: { Authorization: 'Bearer admin-token' }, body };
}

describe('rotas de produtos do painel', () => {
  itRequiresAdmin(() => testApp(), [
    ['POST', '/v1/admin/products'],
    ['PUT', `/v1/admin/products/${productId}`],
    ['PUT', `/v1/admin/products/${productId}/situation`],
    ['POST', `/v1/admin/products/${productId}/order`],
    ['POST', `/v1/admin/products/${productId}/image`],
    ['DELETE', `/v1/admin/products/${productId}/image`],
    ['POST', `/v1/admin/products/${productId}/video/upload`],
    ['POST', `/v1/admin/products/${productId}/video`],
    ['DELETE', `/v1/admin/products/${productId}/video`],
    ['DELETE', `/v1/admin/products/${productId}`],
  ] as const);

  it('exigem token de admin', async () => {
    expect((await testApp().request('/v1/admin/products')).status).toBe(401);
  });

  it('POST converte o preço uma única vez e devolve o id', async () => {
    const repository = fakeProductRepository();

    const response = await testApp(repository).request(
      '/v1/admin/products',
      adminRequest('POST', validInput),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: productId });
    expect(repository.create).toHaveBeenCalledWith({
      name: validInput.name,
      description: null,
      price_cents: 890,
      category_id: categoryId,
      badge: null,
      is_active: true,
      is_available: true,
    });
  });

  it('responde 409 com erro no slug quando o banco recusa duplicata', async () => {
    const repository = fakeProductRepository({
      create: async () => {
        throw new UniqueViolationError();
      },
    });

    const response = await testApp(repository).request(
      '/v1/admin/products',
      adminRequest('POST', validInput),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ fieldErrors: { slug: [expect.any(String)] } });
  });

  it.each([
    ['POST', '/v1/admin/products', 'create'],
    ['PUT', `/v1/admin/products/${productId}`, 'update'],
  ] as const)(
    '%s responde 400 no campo category_id quando a categoria não existe',
    async (method, path, operation) => {
      const repository = fakeProductRepository({
        [operation]: async () => {
          throw new MissingReferenceError('violates foreign key constraint');
        },
      });

      const response = await testApp(repository).request(path, adminRequest(method, validInput));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        status: 'error',
        message: 'A categoria escolhida não existe mais. Escolha outra.',
        fieldErrors: { category_id: ['Escolha uma categoria válida.'] },
      });
    },
  );

  it('PUT responde 400 no campo price quando o preço passa do teto', async () => {
    const repository = fakeProductRepository();

    const response = await testApp(repository).request(
      `/v1/admin/products/${productId}`,
      adminRequest('PUT', { ...validInput, price: '99.999.999' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ fieldErrors: { price: [expect.any(String)] } });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('POST /:id/video responde 409 quando outra requisição troca o vídeo primeiro', async () => {
    const repository = fakeVideoRepository();
    repository.replaceVideoPath = async () => false;
    const videos = new VideoService(repository, async ({ workDir }) => {
      const outputPath = join(workDir!, 'compactado.mp4');
      await writeFile(outputPath, Buffer.from('compactado'));
      return {
        outputPath,
        inputBytes: 10,
        outputBytes: 10,
        duration: 1,
        width: 320,
        height: 180,
        fps: 24,
        hdrConverted: false,
        usedFallback: false,
        elapsedMs: 1,
      };
    });
    const rawPath = `uploads/${productId}_33333333-3333-4333-8333-333333333333.mp4`;

    const response = await testApp(fakeProductRepository(), compressedImage, videos).request(
      `/v1/admin/products/${productId}/video`,
      adminRequest('POST', { path: rawPath }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      status: 'error',
      message: expect.stringContaining('outra aba'),
    });
  });

  it('PUT edita e DELETE apaga o produto', async () => {
    const repository = fakeProductRepository();
    const app = testApp(repository);

    const updated = await app.request(
      `/v1/admin/products/${productId}`,
      adminRequest('PUT', validInput),
    );
    const deleted = await app.request(`/v1/admin/products/${productId}`, adminRequest('DELETE'));

    expect(updated.status).toBe(204);
    expect(deleted.status).toBe(204);
    expect(repository.update).toHaveBeenCalled();
    expect(repository.delete).toHaveBeenCalledWith(productId);
  });

  it('recusa multipart acima de 4 MB com 413', async () => {
    const file = new File([new Uint8Array(4 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });

    const response = await testApp().request(
      `/v1/admin/products/${productId}/image`,
      imageRequest(file),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ message: expect.stringContaining('4 MB') });
  });

  it('recusa arquivo sem tipo de imagem com 400', async () => {
    const file = new File([Buffer.from('not an image')], 'note.txt', { type: 'text/plain' });

    const response = await testApp().request(
      `/v1/admin/products/${productId}/image`,
      imageRequest(file),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining('imagem válida'),
    });
  });

  it('POST /:id/image grava a foto e devolve o caminho', async () => {
    const file = new File([Buffer.from('jpeg')], 'photo.jpg', { type: 'image/jpeg' });

    const response = await testApp().request(
      `/v1/admin/products/${productId}/image`,
      imageRequest(file),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      path: expect.stringMatching(new RegExp(`^products/${productId}/`)),
    });
  });

  it.each([
    ['formato inválido', { mimeType: 'video/avi', size: 1_024 }, 415],
    ['arquivo grande demais', { mimeType: 'video/mp4', size: 52_428_801 }, 413],
  ])('POST /:id/video/upload recusa %s com %i', async (_label, body, status) => {
    const response = await testApp().request(
      `/v1/admin/products/${productId}/video/upload`,
      adminRequest('POST', body),
    );

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ status: 'error', message: expect.any(String) });
  });

  it.each([
    ['HEIC do iPhone', new UnsupportedImageFormatError(), 415, 'HEIC/HEIF'],
    ['pixels demais', new ImageResolutionTooHighError(), 413, '40 megapixels'],
    ['acima do limite do bucket', new ImageTooLargeError(), 413, 'menos de 1 MB'],
  ])('foto %s responde %i com mensagem clara', async (_label, error, status, text) => {
    const file = new File([Buffer.from('heic')], 'IMG_0001.HEIC', { type: 'image/heic' });

    const response = await testApp(fakeProductRepository(), async () => {
      throw error;
    }).request(`/v1/admin/products/${productId}/image`, imageRequest(file));

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ message: expect.stringContaining(text) });
  });

  describe('com o timeout de 15 segundos', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('o envio que passa do prazo responde 504 e não troca a foto depois', async () => {
      vi.useFakeTimers();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const imageRepository = fakeImageRepository();
      const uploadVariants = vi.spyOn(imageRepository, 'uploadVariants');
      const replaceImagePath = vi.spyOn(imageRepository, 'replaceImagePath');
      const images = new ImageService(imageRepository, async () => {
        await new Promise((resolve) => setTimeout(resolve, 20_000));
        return { detail: Buffer.from('detail'), card: Buffer.from('card') };
      });
      const app = new Hono<AppHonoEnv>();
      app.use('*', requestTimeoutMiddleware());
      app.onError(errorHandler);
      app.route(
        '/v1/admin/products',
        createProductsRoutes(
          fakeAdminClients(),
          createProductsController(() => new ProductsService(fakeProductRepository())),
          createImageController('product', () => images),
          createVideoController(
            () =>
              new VideoService(fakeVideoRepository(), async () => {
                throw new Error('compactação não esperada neste teste');
              }),
          ),
        ),
      );
      const file = new File([Buffer.from('jpeg')], 'photo.jpg', { type: 'image/jpeg' });

      const responsePromise = app.request(
        `/v1/admin/products/${productId}/image`,
        imageRequest(file),
      );
      await vi.advanceTimersByTimeAsync(15_000);
      const response = await responsePromise;
      await vi.advanceTimersByTimeAsync(10_000);

      expect(response.status).toBe(504);
      expect(uploadVariants).not.toHaveBeenCalled();
      expect(replaceImagePath).not.toHaveBeenCalled();
    });
  });
});
