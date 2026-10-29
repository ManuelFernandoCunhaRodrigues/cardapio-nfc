'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { initialStoreSettingsActionState } from '@/features/store/server/action-state';
import { updateStoreStatusOverride } from '@/features/store/server/actions';

import { AdminNotice } from '@/features/admin/components/admin-notice';
import { AdminSheet } from '@/features/admin/components/admin-sheet';

function ConfirmStatusButton({ storeOpen }: Readonly<{ storeOpen: boolean | null }>) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`min-h-11 w-full rounded-full px-5 text-sm font-bold text-white ${storeOpen ? 'bg-danger' : 'bg-green'}`}
      disabled={pending || storeOpen === null}
      type="submit"
    >
      {pending ? 'Alterando…' : storeOpen ? 'Fechar loja agora' : 'Abrir loja agora'}
    </button>
  );
}

export function StoreStatusControl({
  storeOpen,
  override,
  compact = false,
}: Readonly<{
  storeOpen: boolean | null;
  override: 'auto' | 'open' | 'closed' | null;
  compact?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [state, action] = useActionState(
    updateStoreStatusOverride,
    initialStoreSettingsActionState,
  );
  const label = storeOpen === null ? 'Indisponível' : storeOpen ? 'Aberta' : 'Fechada';
  return (
    <>
      <button
        aria-haspopup="dialog"
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full font-[family-name:var(--font-poppins)] text-xs font-semibold ${storeOpen ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'} ${compact ? 'px-3' : 'px-3.5'}`}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-current" />
        {label}
      </button>
      <AdminSheet
        onClose={() => setOpen(false)}
        open={open}
        returnFocusRef={triggerRef}
        title="Estado da loja"
      >
        <p className="text-sm leading-6 text-body">
          A loja está <strong>{label.toLocaleLowerCase('pt-BR')}</strong>. A mudança manual vale até
          você voltar a seguir os horários.
        </p>
        <form action={action} className="mt-5 space-y-3">
          <input name="status_override" type="hidden" value={storeOpen ? 'closed' : 'open'} />
          <ConfirmStatusButton storeOpen={storeOpen} />
        </form>
        {override !== 'auto' ? (
          <form action={action} className="mt-3">
            <input name="status_override" type="hidden" value="auto" />
            <button
              className="min-h-11 w-full rounded-full border border-border bg-white px-5 text-sm font-bold text-ink"
              type="submit"
            >
              Voltar a seguir os horários
            </button>
          </form>
        ) : null}
        <AdminNotice
          className="mt-4"
          kind={state.status === 'error' ? 'error' : 'success'}
          message={state.message}
        />
      </AdminSheet>
    </>
  );
}
