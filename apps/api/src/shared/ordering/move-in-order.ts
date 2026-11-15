import type { ReorderInput } from '@salgae/core/contracts/admin-api';
import { findNeighbor, type OrderedItem } from '@salgae/core/rules/reorder';

import { ConflictError, NotFoundError } from '../errors/domain-errors';

/** Parte do repositório de que a reordenação precisa (categorias, destaques e produtos). */
export interface OrderableRepository {
  listSortOrders(): Promise<OrderedItem[]>;
  swapSortOrders(sourceId: string, neighborId: string): Promise<void>;
}

type MoveRequest = ReorderInput & {
  id: string;
  /** Mensagem quando o item já é o primeiro (subir) ou o último (descer) da lista. */
  edgeMessage: string;
  /** Mensagem quando o item não está na lista (apagado em outra aba, por exemplo). */
  notFoundMessage: string;
};

export async function moveInOrder(
  repository: OrderableRepository,
  { id, direction, edgeMessage, notFoundMessage }: MoveRequest,
): Promise<void> {
  const lookup = findNeighbor(await repository.listSortOrders(), id, direction);
  if (lookup.kind === 'missing') throw new NotFoundError(notFoundMessage);
  if (lookup.kind === 'edge') throw new ConflictError(edgeMessage);
  await repository.swapSortOrders(id, lookup.neighbor.id);
}
