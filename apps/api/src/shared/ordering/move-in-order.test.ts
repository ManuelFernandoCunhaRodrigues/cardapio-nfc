import { describe, expect, it, vi } from 'vitest';

import { ConflictError, NotFoundError } from '../errors/domain-errors';
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

const messages = { edgeMessage: 'limite', notFoundMessage: 'sumiu' };

describe('moveInOrder', () => {
  it('troca a posição com o vizinho na direção pedida', async () => {
    const repository = fakeRepository();

    await moveInOrder(repository, { id: 'b', direction: 'up', ...messages });

    expect(repository.swapSortOrders).toHaveBeenCalledWith('b', 'a');
  });

  it('recusa mover o último item para baixo', async () => {
    const repository = fakeRepository();

    await expect(
      moveInOrder(repository, { id: 'b', direction: 'down', ...messages }),
    ).rejects.toEqual(new ConflictError('limite'));
    expect(repository.swapSortOrders).not.toHaveBeenCalled();
  });

  it('responde não encontrado quando o item não está na lista', async () => {
    const repository = fakeRepository();

    await expect(
      moveInOrder(repository, { id: 'apagado', direction: 'up', ...messages }),
    ).rejects.toEqual(new NotFoundError('sumiu'));
    expect(repository.swapSortOrders).not.toHaveBeenCalled();
  });
});
