type ErrorDetails = {
  name?: string;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  requestId?: string;
  stack?: string;
};

function pickText(source: Record<string, unknown>, key: 'code' | 'details' | 'hint' | 'requestId') {
  const value = source[key];
  return typeof value === 'string' && value ? { [key]: value } : {};
}

/** Erros do Supabase chegam como objetos simples; os do JavaScript, como `Error`. */
export function describeError(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    const source = error as Error & Record<string, unknown>;
    return {
      name: error.name,
      message: error.message,
      ...pickText(source, 'code'),
      ...pickText(source, 'details'),
      ...pickText(source, 'hint'),
      ...pickText(source, 'requestId'),
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  if (error && typeof error === 'object') {
    const source = error as Record<string, unknown>;
    return {
      message: typeof source.message === 'string' ? source.message : JSON.stringify(source),
      ...pickText(source, 'code'),
      ...pickText(source, 'details'),
      ...pickText(source, 'hint'),
    };
  }
  return { message: String(error) };
}

/**
 * Registra contexto operacional somente no servidor, sem exibir detalhes ao visitante.
 * Uma linha JSON por erro: os logs da Vercel podem ser filtrados por `event` e `error.code`.
 */
export function reportServerError(event: string, error: unknown): void {
  console.error(
    JSON.stringify({
      level: 'error',
      app: 'salgae',
      event,
      time: new Date().toISOString(),
      error: describeError(error),
    }),
  );
}
