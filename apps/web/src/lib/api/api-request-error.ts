import type { FieldErrors } from '@salgae/core/contracts/admin-api';

export const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente.';

/** Resposta de erro da API: a mensagem já é o texto que a tela mostra. */
export class ApiRequestError extends Error {
  override readonly name = 'ApiRequestError';

  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
  }

  /** Erros 4xx são esperados (validação, conflito, sessão); 5xx são falha do servidor. */
  get isExpected(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}
