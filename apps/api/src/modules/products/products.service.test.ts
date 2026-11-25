import { describe, expect, it, vi } from 'vitest';

import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/domain-errors';
import { UniqueViolationError } from '../../shared/errors/persistence-errors';
import { ProductsService, type ProductRepository } from './products.service';

const productId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const input = {
  name: 'Coxinha',
  description: null,
  price: 'R$ 8,90',
  category_id: categoryId,
  badge: null,
  is_active: true,
  is_available: true,
};

function fakeRepository(overrides: Partial<ProductRepository> = {}): ProductRepository {
  return {
    listForAdmin: async () => [],
    create: async () => productId,
    update: async () => true,
    findCategoryId: async () => categoryId,
    setSituation: async () => true,
    listSortOrders: async () => [{ id: productId, sort_order: 1 }],
    swapSortOrders: async () => undefined,
    delete: async () => ({ imagePath: null, videoPath: null }),
    isImageInUse: async () => false,
    isVideoInUse: async () => false,
    removeImageFiles: async () => undefined,
    removeVideoFile: async () => undefined,
    ...overrides,
  };
}

describe('ProductsService', () => {
  it('mover produto que trocou de categoria em outra aba responde conflito, não 404', async () => {
    const otherCategory = '33333333-3333-4333-8333-333333333333';
    const findCategoryId = vi
      .fn<ProductRepository['findCategoryId']>()
      .mockResolvedValueOnce(categoryId)
      .mockResolvedValue(otherCategory);
    const repository = fakeRepository({
      findCategoryId,
      listSortOrders: async () => [{ id: 'outro', sort_order: 1 }],
    });

    const move = new ProductsService(repository).moveProduct(productId, { direction: 'up' });

    await expect(move).rejects.toBeInstanceOf(ConflictError);
    await expect(move).rejects.toThrow('mudou de categoria');
  });

  it('mover produto apagado em outra aba segue respondendo 404', async () => {
    const findCategoryId = vi
      .fn<ProductRepository['findCategoryId']>()
      .mockResolvedValueOnce(categoryId)
      .mockResolvedValue(null);
    const repository = fakeRepository({
      findCategoryId,
      listSortOrders: async () => [{ id: 'outro', sort_order: 1 }],
    });

    await expect(
      new ProductsService(repository).moveProduct(productId, { direction: 'up' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('traduz slug repetido em conflito com erro no campo slug', async () => {
    const repository = fakeRepository({
      create: async () => {
        throw new UniqueViolationError();
      },
    });

    await expect(new ProductsService(repository).createProduct(input)).rejects.toMatchObject({
      fieldErrors: { slug: ['Esse endereço curto já está em uso.'] },
    });
  });

  it('grava o preço do formulário em centavos', async () => {
    const create = vi.fn(async () => productId);

    await new ProductsService(fakeRepository({ create })).createProduct(input);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ price_cents: 890 }));
    expect(create).toHaveBeenCalledWith(expect.not.objectContaining({ price: expect.anything() }));
  });

  it('recusa preço ilegível com a mensagem do campo como aviso geral', async () => {
    const create = vi.fn(async () => productId);

    const error = await new ProductsService(fakeRepository({ create }))
      .createProduct({ ...input, price: 'preço inválido' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      message: 'Informe um preço válido, como R$ 8,90.',
      fieldErrors: { price: ['Informe um preço válido, como R$ 8,90.'] },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('recusa preço acima do teto antes de chegar ao banco', async () => {
    const create = vi.fn(async () => productId);

    const error = await new ProductsService(fakeRepository({ create }))
      .createProduct({ ...input, price: 'R$ 30.000.000,00' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      fieldErrors: { price: ['O preço máximo é R$ 99.999,99. Confira se não sobrou um zero.'] },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('converte a situação em campos de visibilidade', async () => {
    const setSituation = vi.fn(async () => true);

    await new ProductsService(fakeRepository({ setSituation })).setProductSituation(productId, {
      situation: 'unavailable',
    });

    expect(setSituation).toHaveBeenCalledWith(productId, {
      is_active: true,
      is_available: false,
    });
  });

  it('não apaga foto ainda usada por outro registro', async () => {
    const removeImageFiles = vi.fn(async () => undefined);
    const repository = fakeRepository({
      delete: async () => ({ imagePath: 'products/shared/image', videoPath: null }),
      isImageInUse: async () => true,
      removeImageFiles,
    });

    await new ProductsService(repository).deleteProduct(productId);

    expect(removeImageFiles).not.toHaveBeenCalled();
  });

  it('remove foto e vídeo sem referência depois de apagar o produto', async () => {
    const removeImageFiles = vi.fn(async () => undefined);
    const removeVideoFile = vi.fn(async () => undefined);
    const repository = fakeRepository({
      delete: async () => ({
        imagePath: 'products/id/image',
        videoPath: 'products/id/video.mp4',
      }),
      removeImageFiles,
      removeVideoFile,
    });

    await new ProductsService(repository).deleteProduct(productId);

    expect(removeImageFiles).toHaveBeenCalledWith([
      'products/id/image-detail.webp',
      'products/id/image-card.webp',
    ]);
    expect(removeVideoFile).toHaveBeenCalledWith('products/id/video.mp4');
  });
});
