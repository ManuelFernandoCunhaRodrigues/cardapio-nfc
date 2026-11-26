export type OrderedItem = { id: string; sort_order: number };

/** Resultado de procurar com quem o item troca de posição ao subir ou descer. */
export type NeighborLookup =
  { kind: 'missing' } | { kind: 'edge' } | { kind: 'found'; neighbor: OrderedItem };

export function findNeighbor(
  items: OrderedItem[],
  sourceId: string,
  direction: 'up' | 'down',
): NeighborLookup {
  const index = items.findIndex((item) => item.id === sourceId);
  if (index === -1) return { kind: 'missing' };
  const neighbor = items[index + (direction === 'up' ? -1 : 1)];
  return neighbor ? { kind: 'found', neighbor } : { kind: 'edge' };
}
