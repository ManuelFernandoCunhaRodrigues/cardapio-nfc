import type { FieldErrors } from '@salgae/core/contracts/admin-api';

// Textos únicos da sessão no painel: 401 é sessão vencida (volta ao login); 403 é conta sem acesso.
export const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre de novo para continuar.';
export const ADMIN_FORBIDDEN_MESSAGE = 'Esta conta não tem permissão para mudar o painel.';

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
