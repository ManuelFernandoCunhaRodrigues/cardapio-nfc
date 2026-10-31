'use client';

import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal, useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { layerAttributes, overlayFade } from '@/components/motion/exit-presence';
import { useHydrated } from '@/hooks/use-client-snapshot';
import { useFocusTrap } from '@/features/admin/hooks/use-focus-trap';

type ActionState = { status: 'idle' | 'success' | 'error'; message?: string };
type ConfirmAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" variant="danger">
      {pending ? 'Excluindo…' : 'Excluir de vez'}
    </Button>
  );
}

export function ConfirmDialog({
  action,
  entityId,
  title,
  description,
  triggerLabel = 'Excluir',
  fieldName = 'id',
  onSuccess,
  disabled = false,
  fallbackFocusRef,
}: Readonly<{
  action: ConfirmAction;
  entityId: string;
  title: string;
  description: string;
  triggerLabel?: string;
  fieldName?: string;
  onSuccess?: () => void;
  disabled?: boolean;
  // Para onde o foco vai quando o gatilho some (ex.: o item foi excluído).
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerId = `confirm-trigger-${useId()}`;
  const hydrated = useHydrated();
  const [state, formAction] = useActionState(action, { status: 'idle' });

  const restoreTriggerFocus = useCallback(() => {
    const trigger = triggerRef.current ?? document.getElementById(triggerId);
    const target = trigger?.checkVisibility() ? trigger : fallbackFocusRef?.current;
    target?.focus();
  }, [fallbackFocusRef, triggerId]);

  const closeDialog = useCallback(() => {
    // Foca antes e depois de esconder a confirmação: cobre clique, Escape e um re-render do
    // gatilho entre a ação e o próximo frame.
    restoreTriggerFocus();
    setOpen(false);
    requestAnimationFrame(restoreTriggerFocus);
    window.setTimeout(restoreTriggerFocus, 0);
  }, [restoreTriggerFocus]);

  useEffect(() => {
    if (state.status !== 'success' || !open) return;
    onSuccess?.();
    const timeout = window.setTimeout(closeDialog, 0);
    return () => window.clearTimeout(timeout);
  }, [closeDialog, onSuccess, open, state.status]);

  return (
    <>
      <Button
        aria-haspopup="dialog"
        disabled={disabled}
        id={triggerId}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        variant="danger"
      >
        {triggerLabel}
      </Button>
      {hydrated
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <ConfirmFrame
                  description={description}
                  entityId={entityId}
                  errorMessage={state.status === 'error' ? state.message : undefined}
                  fieldName={fieldName}
                  formAction={formAction}
                  onCancel={closeDialog}
                  title={title}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

function ConfirmFrame({
  entityId,
  fieldName,
  title,
  description,
  errorMessage,
  formAction,
  onCancel,
}: Readonly<{
  entityId: string;
  fieldName: string;
  title: string;
  description: string;
  errorMessage?: string;
  formAction: (formData: FormData) => void;
  onCancel: () => void;
}>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isPresent = useIsPresent();
  const titleId = `dialog-${entityId}`;

  useFocusTrap({
    active: isPresent,
    containerRef: cardRef,
    initialFocusRef: cancelRef,
    onEscape: onCancel,
  });

  return (
    <m.div
      {...overlayFade}
      {...layerAttributes(isPresent)}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/55 p-4"
      role="dialog"
    >
      <m.div
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-card bg-cream p-6 shadow-2xl"
        exit={{ scale: 0.96, y: 8 }}
        initial={{ scale: 0.96, y: 8 }}
        ref={cardRef}
        transition={{ duration: 0.2 }}
      >
        <p className="lbl text-danger">Ação irreversível</p>
        <h2 className="disp mt-2 text-2xl font-extrabold text-ink" id={titleId}>
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-body">{description}</p>
        <form action={formAction} className="mt-6 flex flex-wrap justify-end gap-3">
          <input name={fieldName} type="hidden" value={entityId} />
          <Button onClick={onCancel} ref={cancelRef} type="button" variant="neutral">
            Cancelar
          </Button>
          <ConfirmButton />
        </form>
        {errorMessage ? (
          <p
            aria-live="assertive"
            className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </m.div>
    </m.div>
  );
}
