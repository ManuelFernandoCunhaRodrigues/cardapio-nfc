'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mantém o Tab dentro da camada aberta, fecha com Escape e foca o primeiro controle ao abrir.
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
  const escape = useEffectEvent(onEscape);

  useEffect(() => {
    if (!active) return;
    const focusables = () =>
      Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    const frame = requestAnimationFrame(() =>
      (initialFocusRef?.current ?? focusables()[0])?.focus(),
    );

    function keepFocusInside(event: KeyboardEvent) {
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
  }, [active, containerRef, initialFocusRef]);
}
