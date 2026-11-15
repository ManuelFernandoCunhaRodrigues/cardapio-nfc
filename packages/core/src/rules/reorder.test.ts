import { describe, expect, it } from 'vitest';

import { findNeighbor } from './reorder';

describe('findNeighbor', () => {
  const items = [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
  ];

  it('acha o vizinho na direção pedida', () => {
    expect(findNeighbor(items, 'b', 'up')).toEqual({ kind: 'found', neighbor: items[0] });
    expect(findNeighbor(items, 'b', 'down')).toEqual({ kind: 'found', neighbor: items[2] });
  });

  it('avisa quando o item já está no limite', () => {
    expect(findNeighbor(items, 'a', 'up')).toEqual({ kind: 'edge' });
    expect(findNeighbor(items, 'c', 'down')).toEqual({ kind: 'edge' });
  });

  it('distingue item ausente da lista de item no limite', () => {
    expect(findNeighbor(items, 'z', 'up')).toEqual({ kind: 'missing' });
    expect(findNeighbor([], 'a', 'down')).toEqual({ kind: 'missing' });
  });
});
