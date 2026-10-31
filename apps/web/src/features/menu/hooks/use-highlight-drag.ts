'use client';

import type { PanInfo } from 'motion/react';

const SWIPE_DISTANCE = 48;

export function getDraggedHighlightIndex({
  offsetX,
  currentIndex,
  itemCount,
}: Readonly<{ offsetX: number; currentIndex: number; itemCount: number }>) {
  if (Math.abs(offsetX) < SWIPE_DISTANCE || itemCount < 2) return currentIndex;
  return offsetX < 0 ? (currentIndex + 1) % itemCount : (currentIndex - 1 + itemCount) % itemCount;
}

export function useHighlightDrag({
  activeIndex,
  itemCount,
  onSelect,
}: Readonly<{
  activeIndex: number;
  itemCount: number;
  onSelect: (index: number) => void;
}>) {
  return (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const nextIndex = getDraggedHighlightIndex({
      offsetX: info.offset.x,
      currentIndex: activeIndex,
      itemCount,
    });
    if (nextIndex !== activeIndex) onSelect(nextIndex);
  };
}
