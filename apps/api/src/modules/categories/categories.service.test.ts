import { describe, expect, it, vi } from 'vitest';

import { ConflictError, NotFoundError } from '../../shared/errors/domain-errors';
import {
  ReferencedRecordError,
  UniqueViolationError,
} from '../../shared/errors/persistence-errors';
import {
  CategoriesService,
  type CategoryInput,
  type CategoryRepository,
} from './categories.service';

const categoryId = '11111111-1111-4111-8111-111111111111';
const input: CategoryInput = {
  name: 'Coxinhas',
  slug: 'coxinhas',
  description: null,
  is_active: true,
};

function fakeRepository(overrides: Partial<CategoryRepository> = {}): CategoryRepository {
  return {
    listForAdmin: async () => [
      { ...input, id: categoryId, image_path: null, sort_order: 10, product_count: 2 },
    ],
    create: async () => categoryId,
    update: async () => true,
    setActive: async () => true,
    listSortOrders: async () => [{ id: categoryId, sort_order: 10 }],
    swapSortOrders: vi.fn(async () => undefined),
    delete: async () => true,
    ...overrides,
  };
}

describe('CategoriesService', () => {
  it('lista as categorias do painel com a contagem de produtos', async () => {
    const categories = await new CategoriesService(fakeRepository()).listCategories();

    expect(categories).toEqual([expect.objectContaining({ slug: 'coxinhas', product_count: 2 })]);
  });

  it('recusa endereço curto repetido apontando o campo', async () => {
    const service = new CategoriesService(
      fakeRepository({
        create: async () => {
          throw new UniqueViolationError('duplicate key');
        },
      }),
    );

    const error = await service.createCategory(input).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ fieldErrors: { slug: ['Esse endereço curto já está em uso.'] } });
  });

  it('avisa quando a categoria editada não existe', async () => {
    const service = new CategoriesService(fakeRepository({ update: async () => false }));

    await expect(service.updateCategory(categoryId, input)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('não apaga categoria com produtos', async () => {
    const service = new CategoriesService(
      fakeRepository({
        delete: async () => {
          throw new ReferencedRecordError('foreign key');
        },
      }),
    );

    await expect(service.deleteCategory(categoryId)).rejects.toThrow(
      'Esta categoria possui produtos vinculados.',
    );
  });

  it('não move a única categoria da lista', async () => {
    const repository = fakeRepository();

    await expect(
      new CategoriesService(repository).moveCategory(categoryId, { direction: 'up' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.swapSortOrders).not.toHaveBeenCalled();
  });
});
