import { describe, expect, it } from 'vitest';

import { swapSortOrders } from './reorder';

describe('swapSortOrders', () => {
  const items = [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
  ];

  it('troca a ordem com o vizinho indicado', () => {
    expect(swapSortOrders(items, 'b', 'up')).toEqual([
      { id: 'b', sort_order: 0 },
      { id: 'a', sort_order: 1 },
    ]);
    expect(swapSortOrders(items, 'b', 'down')).toEqual([
      { id: 'b', sort_order: 2 },
      { id: 'c', sort_order: 1 },
    ]);
  });

  it('não move além dos limites', () => {
    expect(swapSortOrders(items, 'a', 'up')).toBeNull();
    expect(swapSortOrders(items, 'c', 'down')).toBeNull();
  });
});
