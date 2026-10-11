'use client';

import { useActionState, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';

type ActionState = { status: 'idle' | 'success' | 'error'; message?: string };
type ConfirmAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function ConfirmButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit" variant="danger">{pending ? 'Excluindo…' : 'Excluir de vez'}</Button>;
}

export function ConfirmDialog({ action, entityId, title, description, triggerLabel = 'Excluir', fieldName = 'id', onSuccess, disabled = false }: Readonly<{ action: ConfirmAction; entityId: string; title: string; description: string; triggerLabel?: string; fieldName?: string; onSuccess?: () => void; disabled?: boolean }>) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerId = `confirm-trigger-${useId()}`;
  const [state, formAction] = useActionState(action, { status: 'idle' });

  const restoreTriggerFocus = useCallback(() => {
    const trigger = triggerRef.current ?? document.getElementById(triggerId) as HTMLButtonElement | null;
    trigger?.focus();
  }, [triggerId]);

  const closeDialog = useCallback(() => {
    // Foca antes e depois de desmontar o portal: cobre clique, Escape e um
    // re-render do gatilho entre a ação e o próximo frame.
    restoreTriggerFocus();
    setOpen(false);
    requestAnimationFrame(restoreTriggerFocus);
    window.setTimeout(restoreTriggerFocus, 0);
  }, [restoreTriggerFocus]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])');
    requestAnimationFrame(() => cancelRef.current?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDialog();
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeDialog, open]);

  useEffect(() => {
    if (state.status !== 'success' || !open) return;
    onSuccess?.();
    const timeout = window.setTimeout(closeDialog, 0);
    return () => window.clearTimeout(timeout);
  }, [closeDialog, onSuccess, open, state.status]);

  const dialog = open ? <div aria-labelledby={`dialog-${entityId}`} aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" role="dialog">
      <div className="w-full max-w-md rounded-card bg-cream p-6 shadow-2xl" ref={dialogRef}>
        <p className="lbl text-danger">Ação irreversível</p>
        <h2 className="disp mt-2 text-2xl font-extrabold text-ink" id={`dialog-${entityId}`}>{title}</h2>
        <p className="mt-3 text-sm leading-6 text-body">{description}</p>
        <form action={formAction} className="mt-6 flex flex-wrap justify-end gap-3">
          <input name={fieldName} type="hidden" value={entityId} />
          <Button onClick={closeDialog} ref={cancelRef} type="button" variant="neutral">Cancelar</Button>
          <ConfirmButton />
        </form>
        {state.status === 'error' && state.message ? <p aria-live="assertive" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{state.message}</p> : null}
      </div>
    </div> : null;

  return <>
    <Button aria-haspopup="dialog" disabled={disabled} id={triggerId} onClick={() => setOpen(true)} ref={triggerRef} variant="danger">{triggerLabel}</Button>
    {dialog && typeof document !== 'undefined' ? createPortal(dialog, document.body) : null}
  </>;
}
