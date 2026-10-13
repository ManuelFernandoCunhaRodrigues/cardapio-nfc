'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { AdminIcon } from './admin-icon';

export function AdminSheet({ open, title, onClose, children, labelledBy, returnFocusRef }: Readonly<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode; labelledBy?: string; returnFocusRef?: RefObject<HTMLElement | null> }>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const titleId = labelledBy ?? 'admin-sheet-title';

  const close = useCallback(() => {
    onClose();
    window.setTimeout(() => (returnFocusRef?.current ?? originRef.current)?.focus(), 0);
  }, [onClose, returnFocusRef]);

  useEffect(() => {
    if (!open) return;
    originRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () => panel?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    requestAnimationFrame(() => focusables()?.[0]?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables(); if (!items?.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; };
  }, [close, open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(<div className="fixed inset-0 z-[90] bg-ink/55" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div aria-labelledby={titleId} aria-modal="true" className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[30rem] lg:rounded-none lg:p-6" ref={panelRef} role="dialog">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="disp text-xl font-bold text-ink" id={titleId}>{title}</h2><button aria-label="Fechar" className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border bg-white text-ink" onClick={close} type="button"><AdminIcon name="close" /></button></div>
      {children}
    </div>
  </div>, document.body);
}
