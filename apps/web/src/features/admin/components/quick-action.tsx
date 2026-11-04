'use client';

import {
  createContext,
  use,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { AdminIcon } from './admin-icon';
import { AdminNotice } from './admin-notice';

type QuickActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

type QuickActionLock = {
  busy: boolean;
  /** Fica com a vez, se estiver livre. Síncrono: vale até para cliques no mesmo instante. */
  acquire: () => boolean;
  release: () => void;
};

const INITIAL_STATE: QuickActionState = { status: 'idle' };
const QuickActionLockContext = createContext<QuickActionLock | null>(null);

/**
 * Faz os botões de uma lista esperarem um ao outro. O Next roda as Server Actions em fila: sem
 * isto, cada clique em outro item entra nessa fila e a lista segue mudando depois de parar de clicar.
 */
export function QuickActionGroup({ children }: Readonly<{ children: ReactNode }>) {
  const [busy, setBusy] = useState(false);
  const taken = useRef(false);
  const acquire = useCallback(() => {
    if (taken.current) return false;
    taken.current = true;
    setBusy(true);
    return true;
  }, []);
  const release = useCallback(() => {
    taken.current = false;
    setBusy(false);
  }, []);
  const lock = useMemo(() => ({ busy, acquire, release }), [busy, acquire, release]);
  return <QuickActionLockContext value={lock}>{children}</QuickActionLockContext>;
}

function useQuickActionLock(): QuickActionLock {
  const lock = use(QuickActionLockContext);
  if (!lock) throw new Error('QuickAction precisa estar dentro de um QuickActionGroup.');
  return lock;
}

/** Botão de uma ação só das listas do painel (Subir, Descer, Esconder), que leva alguns segundos. */
export function QuickAction({
  action,
  values,
  label,
  icon,
  disabled = false,
  onResult,
}: Readonly<{
  action: (state: QuickActionState, formData: FormData) => Promise<QuickActionState>;
  values: Record<string, string>;
  label: string;
  icon?: 'up' | 'down';
  disabled?: boolean;
  /** Quem passa isto mostra o resultado na própria tela; sem ele, o erro aparece junto do botão. */
  onResult?: (state: QuickActionState) => void;
}>) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const { busy, acquire, release } = useQuickActionLock();
  const holdsLock = useRef(false);

  useEffect(() => {
    if (state.status !== 'idle' && state.message) onResult?.(state);
  }, [onResult, state]);
  useEffect(() => {
    if (pending || !holdsLock.current) return;
    holdsLock.current = false;
    release();
  }, [pending, release]);
  // O botão pode sumir da tela com a ação em andamento (o item foi filtrado, por exemplo).
  useEffect(
    () => () => {
      if (holdsLock.current) release();
    },
    [release],
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (acquire()) holdsLock.current = true;
        else event.preventDefault();
      }}
    >
      {Object.entries(values).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      {/* aria-disabled, e não disabled: quem usa o teclado não perde o foco a cada clique. */}
      <button
        aria-busy={pending}
        aria-disabled={busy}
        aria-label={label}
        className={`grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white text-xs font-bold text-ink disabled:opacity-40 aria-disabled:cursor-progress aria-disabled:opacity-60 ${icon ? '' : 'px-3'}`}
        disabled={disabled}
        title={icon ? label : undefined}
        type="submit"
      >
        {icon && pending ? (
          <>
            <span
              aria-hidden="true"
              className="size-5 animate-spin rounded-full border-2 border-border border-t-brand motion-reduce:hidden"
              data-testid="quick-action-spinner"
            />
            <AdminIcon className="hidden motion-reduce:block" name={icon} />
          </>
        ) : icon ? (
          <AdminIcon name={icon} />
        ) : (
          label
        )}
      </button>
      {onResult ? null : (
        <>
          <span
            aria-live="polite"
            className="sr-only"
            role={state.status === 'error' ? 'alert' : 'status'}
          >
            {state.message}
          </span>
          {state.status === 'error' ? (
            <AdminNotice className="mt-2" kind="error" message={state.message} />
          ) : null}
        </>
      )}
    </form>
  );
}
