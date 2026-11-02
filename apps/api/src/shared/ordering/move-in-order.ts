import type { ReorderInput } from '@salgae/core/contracts/admin-api';
import { swapSortOrders, type OrderedItem } from '@salgae/core/rules/reorder';

import { ConflictError } from '../errors/domain-errors.js';

/** Parte do repositório de que a reordenação precisa (categorias, destaques e produtos). */
export interface OrderableRepository {
  listSortOrders(): Promise<OrderedItem[]>;
  swapSortOrders(sourceId: string, neighborId: string): Promise<void>;
}

type MoveRequest = ReorderInput & {
  id: string;
  /** Mensagem quando o item já é o primeiro (subir) ou o último (descer) da lista. */
  edgeMessage: string;
};

export async function moveInOrder(
  repository: OrderableRepository,
  { id, direction, edgeMessage }: MoveRequest,
): Promise<void> {
  const pair = swapSortOrders(await repository.listSortOrders(), id, direction);
  if (!pair) throw new ConflictError(edgeMessage);
  await repository.swapSortOrders(id, pair[1].id);
}
