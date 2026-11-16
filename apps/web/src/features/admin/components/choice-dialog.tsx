'use client';

import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { layerAttributes, overlayFade } from '@/components/motion/exit-presence';
import { useHydrated } from '@/hooks/use-client-snapshot';
import { useFocusTrap } from '@/features/admin/hooks/use-focus-trap';

type ChoiceDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Pergunta de duas respostas que não chama o servidor (descartar alterações, sair do painel).
 * O foco começa em "cancelar": Enter por engano não perde nada.
 */
export function ChoiceDialog({ open, ...frameProps }: Readonly<ChoiceDialogProps>) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return createPortal(
    <AnimatePresence>{open ? <ChoiceFrame {...frameProps} /> : null}</AnimatePresence>,
    document.body,
  );
}

function ChoiceFrame({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Voltar',
  onConfirm,
  onCancel,
}: Readonly<Omit<ChoiceDialogProps, 'open'>>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isPresent = useIsPresent();
  const titleId = `choice-${useId()}`;
  const [origin] = useState(() => document.activeElement as HTMLElement | null);

  // Quem desiste volta para onde estava (o botão Sair, o campo da gaveta).
  function cancel() {
    onCancel();
    requestAnimationFrame(() => origin?.focus());
  }

  useFocusTrap({
    active: isPresent,
    containerRef: cardRef,
    initialFocusRef: cancelRef,
    onEscape: cancel,
  });

  return (
    <m.div
      {...overlayFade}
      {...layerAttributes(isPresent)}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/55 p-4"
      onMouseDown={(event) => {
        // Sem isto, o clique no fundo chegaria à gaveta de baixo pela árvore do React.
        event.stopPropagation();
        if (event.target === event.currentTarget) cancel();
      }}
      role="alertdialog"
    >
      <m.div
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-card bg-cream p-6 shadow-2xl"
        exit={{ scale: 0.96, y: 8 }}
        initial={{ scale: 0.96, y: 8 }}
        ref={cardRef}
        transition={{ duration: 0.2 }}
      >
        <h2 className="disp text-2xl font-extrabold text-ink" id={titleId}>
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-body">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button onClick={cancel} ref={cancelRef} type="button" variant="neutral">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} type="button" variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </m.div>
    </m.div>
  );
}
