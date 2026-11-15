export type OrderedItem = { id: string; sort_order: number };

export function swapSortOrders(
  items: OrderedItem[],
  sourceId: string,
  direction: 'up' | 'down',
): [OrderedItem, OrderedItem] | null {
  const index = items.findIndex((item) => item.id === sourceId);
  const target = items[index + (direction === 'up' ? -1 : 1)];
  const source = items[index];
  return source && target
    ? [
        { id: source.id, sort_order: target.sort_order },
        { id: target.id, sort_order: source.sort_order },
      ]
    : null;
}
