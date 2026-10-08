/** Registra contexto operacional somente no servidor, sem exibir detalhes ao visitante. */
export function reportServerError(event: string, error: unknown): void {
  console.error(`[salgae] ${event}`, error);
}
