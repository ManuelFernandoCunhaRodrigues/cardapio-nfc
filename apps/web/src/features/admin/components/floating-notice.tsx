'use client';

import { useEffect } from 'react';

import { AdminIcon } from './admin-icon';
import { AdminNotice } from './admin-notice';

type Feedback = { message: string; kind: 'success' | 'error' };

const SUCCESS_VISIBLE_MS = 4_000;

/**
 * Resultado das ações de uma lista longa, preso à tela: acima da barra de navegação no celular e
 * no alto à direita no computador. Quem está rolado no meio da lista vê o aviso sem voltar ao topo.
 * O sucesso some sozinho; o erro fica até a pessoa fechar ou fazer outra ação.
 */
export function FloatingNotice({
  feedback,
  onDismiss,
}: Readonly<{ feedback: Feedback | null; onDismiss: () => void }>) {
  useEffect(() => {
    if (feedback?.kind !== 'success') return;
    const timer = setTimeout(onDismiss, SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [feedback, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[5.75rem] z-50 lg:inset-x-auto lg:bottom-auto lg:right-8 lg:top-6 lg:w-96">
      <div className="pointer-events-auto relative">
        <AdminNotice
          className="pr-12 shadow-xl"
          kind={feedback?.kind ?? 'success'}
          message={feedback?.message}
        />
        {feedback ? (
          <button
            aria-label="Fechar aviso"
            className={`absolute right-0 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-xl ${feedback.kind === 'error' ? 'text-danger' : 'text-green'}`}
            onClick={onDismiss}
            type="button"
          >
            <AdminIcon height={18} name="close" width={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
