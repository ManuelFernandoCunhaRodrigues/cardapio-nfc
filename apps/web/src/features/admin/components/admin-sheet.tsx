'use client';

import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { layerAttributes, overlayFade } from '@/components/motion/exit-presence';
import { useHydrated, useMediaQuery } from '@/hooks/use-client-snapshot';
import { useFocusTrap } from '@/features/admin/hooks/use-focus-trap';

import { AdminIcon } from './admin-icon';

type AdminSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const sheetTransition = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.24 } as const;

export function AdminSheet({ open, ...frameProps }: Readonly<AdminSheetProps>) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return createPortal(
    <AnimatePresence>{open ? <SheetFrame {...frameProps} /> : null}</AnimatePresence>,
    document.body,
  );
}

function SheetFrame({
  title,
  onClose,
  children,
  labelledBy,
  returnFocusRef,
}: Readonly<Omit<AdminSheetProps, 'open'>>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isOpen = useIsPresent();
  const sidePanel = useMediaQuery('(min-width: 1024px)');
  const offscreen = sidePanel ? { x: '100%' } : { y: '100%' };
  const titleId = labelledBy ?? 'admin-sheet-title';

  const { covered } = useFocusTrap({ active: isOpen, containerRef: panelRef, onEscape: onClose });
  useReturnFocusOnExit(isOpen, returnFocusRef);
  useLockedPageScroll(isOpen);

  return (
    <m.div
      {...overlayFade}
      {...layerAttributes(isOpen && !covered)}
      className="fixed inset-0 z-[90] bg-ink/55"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <m.div
        animate={{ x: 0, y: 0 }}
        aria-labelledby={titleId}
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[30rem] lg:rounded-none lg:p-6"
        exit={offscreen}
        initial={offscreen}
        ref={panelRef}
        role="dialog"
        transition={sheetTransition}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="disp text-xl font-bold text-ink" id={titleId}>
            {title}
          </h2>
          <button
            aria-label="Fechar"
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border bg-white text-ink"
            onClick={onClose}
            type="button"
          >
            <AdminIcon name="close" />
          </button>
        </div>
        {children}
      </m.div>
    </m.div>
  );
}

// Vale para todo jeito de fechar (botão, Escape, fundo ou o formulário salvo): quando a saída
// começa, o foco volta para quem abriu a gaveta.
function useReturnFocusOnExit(isOpen: boolean, returnFocusRef?: RefObject<HTMLElement | null>) {
  const originRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    originRef.current = document.activeElement as HTMLElement | null;
  }, []);

  useEffect(() => {
    if (!isOpen) (returnFocusRef?.current ?? originRef.current)?.focus();
  }, [isOpen, returnFocusRef]);
}

function useLockedPageScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [locked]);
}
