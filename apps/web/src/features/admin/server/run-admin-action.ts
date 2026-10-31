import type { FieldErrors } from '@salgae/core/contracts/admin-api';

import { ApiRequestError } from '@/lib/api/api-request-error';
import { reportServerError } from '@/lib/observability';

export type AdminActionError = {
  status: 'error';
  message: string;
  fieldErrors?: FieldErrors;
};

type AdminActionOptions = {
  /** Nome do evento registrado quando a falha não é esperada (API fora do ar, erro 5xx). */
  event: string;
  /** Texto mostrado ao admin nesse caso. */
  failureMessage: string;
};

/** Lê um campo de texto do formulário; ausente vira texto vazio, que o schema da API recusa. */
export function readFormText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export function toAdminActionError(error: unknown, options: AdminActionOptions): AdminActionError {
  if (error instanceof ApiRequestError && error.isExpected) {
    return {
      status: 'error',
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    };
  }
  reportServerError(options.event, error);
  return { status: 'error', message: options.failureMessage };
}

/**
 * Executa a chamada à API de uma Server Action do painel. A API valida, autoriza e devolve o
 * texto dos erros esperados; aqui só traduzimos o resultado para o estado do formulário.
 */
export async function runAdminAction<TSuccess>(
  perform: () => Promise<TSuccess>,
  options: AdminActionOptions,
): Promise<TSuccess | AdminActionError> {
  try {
    return await perform();
  } catch (error) {
    return toAdminActionError(error, options);
  }
}
