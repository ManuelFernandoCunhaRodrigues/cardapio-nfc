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
import { ChoiceDialog } from './choice-dialog';

type QuickActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

type QuickActionLock = {
  busy: boolean;
  /** Muda a cada ação da lista: o aviso de erro da ação anterior deixa de valer. */
  actionNumber: number;
  /** Fica com a vez, se estiver livre, e devolve o número da ação. Síncrono: vale até para cliques no mesmo instante. */
  acquire: () => number | null;
  release: () => void;
};

const INITIAL_STATE: QuickActionState = { status: 'idle' };

type QuickActionConfirm = { title: string; description: string; confirmLabel: string };
const QuickActionLockContext = createContext<QuickActionLock | null>(null);

/**
 * Faz os botões de uma lista esperarem um ao outro. O Next roda as Server Actions em fila: sem
 * isto, cada clique em outro item entra nessa fila e a lista segue mudando depois de parar de clicar.
 */
export function QuickActionGroup({ children }: Readonly<{ children: ReactNode }>) {
  const [busy, setBusy] = useState(false);
  const [actionNumber, setActionNumber] = useState(0);
  const taken = useRef(false);
  const lastAction = useRef(0);
  const acquire = useCallback(() => {
    if (taken.current) return null;
    taken.current = true;
    lastAction.current += 1;
    setBusy(true);
    setActionNumber(lastAction.current);
    return lastAction.current;
  }, []);
  const release = useCallback(() => {
    taken.current = false;
    setBusy(false);
  }, []);
  const lock = useMemo(
    () => ({ busy, actionNumber, acquire, release }),
    [busy, actionNumber, acquire, release],
  );
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
  confirm,
  onResult,
}: Readonly<{
  action: (state: QuickActionState, formData: FormData) => Promise<QuickActionState>;
  values: Record<string, string>;
  label: string;
  icon?: 'up' | 'down';
  disabled?: boolean;
  /** Pergunta antes de enviar, quando a ação tem efeito que a pessoa precisa saber. */
  confirm?: QuickActionConfirm;
  /**
   * Quem passa isto mostra o resultado na própria tela; sem ele, o erro aparece junto do botão.
   * Recebe o estado inicial quando a ação começa, para tirar o aviso anterior.
   */
  onResult?: (state: QuickActionState) => void;
}>) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const { busy, actionNumber, acquire, release } = useQuickActionLock();
  const holdsLock = useRef(false);
  const [ownAction, setOwnAction] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const [asking, setAsking] = useState(false);

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
        if (disabled) {
          event.preventDefault();
          return;
        }
        if (confirm && !confirmed.current) {
          event.preventDefault();
          if (!busy) setAsking(true);
          return;
        }
        confirmed.current = false;
        const acquired = acquire();
        if (acquired === null) {
          event.preventDefault();
          return;
        }
        holdsLock.current = true;
        setOwnAction(acquired);
        onResult?.(INITIAL_STATE);
      }}
      ref={formRef}
    >
      {Object.entries(values).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      {/* aria-disabled, e não disabled: quem usa o teclado não perde o foco a cada clique, nem quando
          o item chega ao limite da lista e a seta que o levou até lá deixa de valer. */}
      <button
        aria-busy={pending}
        aria-disabled={busy || disabled}
        aria-label={label}
        className={`grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white text-xs font-bold text-ink ${disabled ? 'cursor-not-allowed opacity-40' : 'aria-disabled:cursor-progress aria-disabled:opacity-60'} ${icon ? '' : 'px-3'}`}
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
          {state.status === 'error' && ownAction === actionNumber && !pending ? (
            <AdminNotice className="mt-2" kind="error" message={state.message} />
          ) : null}
        </>
      )}
      {confirm ? (
        <ChoiceDialog
          confirmLabel={confirm.confirmLabel}
          description={confirm.description}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            confirmed.current = true;
            formRef.current?.requestSubmit();
          }}
          open={asking}
          title={confirm.title}
        />
      ) : null}
    </form>
  );
}
