'use client';

import { type PanInfo, useDragControls } from 'motion/react';
import { useRef, type DragEvent, type MouseEvent, type PointerEvent } from 'react';

const SWIPE_DISTANCE = 48;

export function getDraggedHighlightIndex({
  offsetX,
  currentIndex,
  itemCount,
}: Readonly<{ offsetX: number; currentIndex: number; itemCount: number }>) {
  if (Math.abs(offsetX) < SWIPE_DISTANCE || itemCount < 2) return currentIndex;
  return offsetX < 0 ? (currentIndex + 1) % itemCount : (currentIndex - 1 + itemCount) % itemCount;
}

// O arrasto do Motion só começa com o mouse: no toque, a rolagem nativa com `scroll-snap`
// continua cuidando da troca (o `drag` com escuta própria trocaria o `touch-action` da trilha).
export function useHighlightDrag({
  activeIndex,
  itemCount,
  onSelect,
}: Readonly<{
  activeIndex: number;
  itemCount: number;
  onSelect: (index: number) => void;
}>) {
  const dragControls = useDragControls();
  const draggedRef = useRef(false);

  function startMouseDrag(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    draggedRef.current = false;
    dragControls.start(event);
  }

  // Sem isso o navegador arrasta a imagem ou o link do slide e cancela o arrasto do Motion.
  function preventNativeDrag(event: DragEvent) {
    event.preventDefault();
  }

  // Marcado no início: o `onDragEnd` do Motion só roda depois do clique que segue o arrasto.
  function markDragged() {
    draggedRef.current = true;
  }

  function selectDraggedHighlight(_event: unknown, info: PanInfo) {
    const nextIndex = getDraggedHighlightIndex({
      offsetX: info.offset.x,
      currentIndex: activeIndex,
      itemCount,
    });
    if (nextIndex !== activeIndex) onSelect(nextIndex);
  }

  // Soltar o botão sobre o slide gera um clique no link: depois de arrastar, ele não navega.
  function blockClickAfterDrag(event: MouseEvent) {
    if (!draggedRef.current) return;
    draggedRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    dragControls,
    startMouseDrag,
    preventNativeDrag,
    markDragged,
    selectDraggedHighlight,
    blockClickAfterDrag,
  };
}
