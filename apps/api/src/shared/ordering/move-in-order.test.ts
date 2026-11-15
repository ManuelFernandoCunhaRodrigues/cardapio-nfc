import { describe, expect, it, vi } from 'vitest';

import { ConflictError } from '../errors/domain-errors';
import { moveInOrder, type OrderableRepository } from './move-in-order';

function fakeRepository(): OrderableRepository {
  return {
    listSortOrders: async () => [
      { id: 'a', sort_order: 10 },
      { id: 'b', sort_order: 20 },
    ],
    swapSortOrders: vi.fn(async () => undefined),
  };
}

describe('moveInOrder', () => {
  it('troca a posição com o vizinho na direção pedida', async () => {
    const repository = fakeRepository();

    await moveInOrder(repository, { id: 'b', direction: 'up', edgeMessage: 'limite' });

    expect(repository.swapSortOrders).toHaveBeenCalledWith('b', 'a');
  });

  it('recusa mover o último item para baixo', async () => {
    const repository = fakeRepository();

    await expect(
      moveInOrder(repository, { id: 'b', direction: 'down', edgeMessage: 'limite' }),
    ).rejects.toEqual(new ConflictError('limite'));
    expect(repository.swapSortOrders).not.toHaveBeenCalled();
  });
});
