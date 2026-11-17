import type { FieldErrors } from '@salgae/core/contracts/admin-api';
import { unstable_rethrow } from 'next/navigation';

import { readSubmittedValues, type SubmittedValues } from '@/features/admin/rules/submitted-values';
import { redirectIfSessionExpiredForRequest } from '@/features/admin/server/session-redirect';
import { ADMIN_FORBIDDEN_MESSAGE, ApiRequestError } from '@/lib/api/api-request-error';
import { reportServerError } from '@/lib/observability';

export type AdminActionError = {
  status: 'error';
  message: string;
  fieldErrors?: FieldErrors;
  values?: SubmittedValues;
};

type AdminActionOptions = {
  /** Nome do evento registrado quando a falha não é esperada (API fora do ar, erro 5xx). */
  event: string;
  /** Texto mostrado ao admin nesse caso. */
  failureMessage: string;
  /** Formulário enviado: em qualquer erro, os textos voltam no estado para não se perderem. */
  submitted?: FormData;
};

/** Lê um campo de texto do formulário; ausente vira texto vazio, que o schema da API recusa. */
export function readFormText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function describeAdminActionError(
  error: unknown,
  options: AdminActionOptions,
): Omit<AdminActionError, 'values'> {
  if (error instanceof ApiRequestError && error.status === 403) {
    return { status: 'error', message: ADMIN_FORBIDDEN_MESSAGE };
  }
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
    // `redirect` e afins do Next lançam um erro próprio, que não é falha da ação.
    unstable_rethrow(error);
    // Sessão vencida segue o mesmo caminho das leituras: login com o motivo e volta para a tela.
    await redirectIfSessionExpiredForRequest(error);
    const failure = describeAdminActionError(error, options);
    return options.submitted
      ? { ...failure, values: readSubmittedValues(options.submitted) }
      : failure;
  }
}
