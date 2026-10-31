import { describe, expect, it } from 'vitest';

import { getDraggedHighlightIndex } from './use-highlight-drag';

describe('getDraggedHighlightIndex', () => {
  it('keeps the current highlight for a short drag', () => {
    expect(getDraggedHighlightIndex({ offsetX: 20, currentIndex: 1, itemCount: 3 })).toBe(1);
  });

  it('selects the next highlight when dragging left', () => {
    expect(getDraggedHighlightIndex({ offsetX: -60, currentIndex: 1, itemCount: 3 })).toBe(2);
  });

  it('wraps to the final highlight when dragging right from the start', () => {
    expect(getDraggedHighlightIndex({ offsetX: 60, currentIndex: 0, itemCount: 3 })).toBe(2);
  });
});
