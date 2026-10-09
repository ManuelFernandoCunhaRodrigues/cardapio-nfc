'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';

type ActionState = { status: 'idle' | 'success' | 'error'; message?: string };
type ConfirmAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function ConfirmButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit" variant="danger">{pending ? 'Excluindo…' : 'Excluir de vez'}</Button>;
}

export function ConfirmDialog({ action, entityId, title, description, triggerLabel = 'Excluir' }: Readonly<{ action: ConfirmAction; entityId: string; title: string; description: string; triggerLabel?: string }>) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState(action, { status: 'idle' });

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return <>
    <Button aria-haspopup="dialog" onClick={() => setOpen(true)} variant="danger">{triggerLabel}</Button>
    {open ? <div aria-labelledby={`dialog-${entityId}`} aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" role="dialog">
      <div className="w-full max-w-md rounded-card bg-cream p-6 shadow-2xl" ref={dialogRef}>
        <p className="lbl text-danger">Ação irreversível</p>
        <h2 className="disp mt-2 text-2xl font-extrabold text-ink" id={`dialog-${entityId}`}>{title}</h2>
        <p className="mt-3 text-sm leading-6 text-body">{description}</p>
        <form action={formAction} className="mt-6 flex flex-wrap justify-end gap-3">
          <input name="id" type="hidden" value={entityId} />
          <Button onClick={() => setOpen(false)} type="button" variant="neutral">Cancelar</Button>
          <ConfirmButton />
        </form>
        {state.status === 'error' && state.message ? <p aria-live="assertive" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{state.message}</p> : null}
      </div>
    </div> : null}
  </>;
}
