'use client';

import { useEffect, type RefObject } from 'react';

type FormState = { status: 'idle' | 'success' | 'error' };

// `data-invalid` marca grupos de botões, que não aceitam `aria-invalid`.
const INVALID_FIELD_SELECTOR = '[aria-invalid="true"], [data-invalid]';

/**
 * Depois de um envio recusado, leva o foco ao primeiro campo marcado como inválido e o centraliza
 * na tela: no celular o campo costuma estar fora da vista, e a mensagem perto dele explica o erro.
 */
export function useFocusFirstInvalid(
  formRef: RefObject<HTMLFormElement | null>,
  state: FormState,
): void {
  useEffect(() => {
    if (state.status !== 'error') return;
    const field = formRef.current?.querySelector<HTMLElement>(INVALID_FIELD_SELECTOR);
    if (!field) return;
    field.focus({ preventScroll: true });
    field.scrollIntoView({ block: 'center' });
  }, [formRef, state]);
}
