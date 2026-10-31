'use client';

import { useEffect, useEffectEvent, useState, useSyncExternalStore, type RefObject } from 'react';

import { createLayerStack } from '@/features/admin/rules/layer-stack';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Uma pilha só para todo o painel: a confirmação aberta sobre a gaveta cobre a gaveta.
const openLayers = createLayerStack();

// Mantém o Tab dentro da camada aberta, fecha com Escape e foca o primeiro controle ao abrir.
// Devolve `covered` quando outra camada abriu por cima desta.
export function useFocusTrap({
  active,
  containerRef,
  onEscape,
  initialFocusRef,
}: Readonly<{
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onEscape: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}>) {
  const [layer] = useState(() => Symbol('admin-layer'));
  const escape = useEffectEvent(onEscape);
  const covered = useSyncExternalStore(
    openLayers.subscribe,
    () => openLayers.isCovered(layer),
    () => false,
  );

  useEffect(() => {
    if (!active) return;
    openLayers.open(layer);
    return () => openLayers.close(layer);
  }, [active, layer]);

  useEffect(() => {
    if (!active) return;
    const focusables = () =>
      Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    const frame = requestAnimationFrame(() =>
      (initialFocusRef?.current ?? focusables()[0])?.focus(),
    );

    function keepFocusInside(event: KeyboardEvent) {
      // `defaultPrevented`: a camada de cima já tratou a tecla e pode ter saído da pilha antes
      // deste listener rodar.
      if (event.defaultPrevented || !openLayers.isTop(layer)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        escape();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', keepFocusInside);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keepFocusInside);
    };
  }, [active, containerRef, initialFocusRef, layer]);

  return { covered };
}
