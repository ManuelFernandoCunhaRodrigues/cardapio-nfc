type ErrorDetails = {
  name?: string;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  stack?: string;
};

type ServerErrorContext = {
  event: string;
  error: unknown;
  requestId: string;
};

function pickText(source: Record<string, unknown>, key: 'code' | 'details' | 'hint') {
  const value = source[key];
  return typeof value === 'string' && value ? { [key]: value } : {};
}

export function describeError(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    const source = error as Error & Record<string, unknown>;
    return {
      name: error.name,
      message: error.message,
      ...pickText(source, 'code'),
      ...pickText(source, 'details'),
      ...pickText(source, 'hint'),
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

export function reportServerError({ event, error, requestId }: ServerErrorContext): void {
  console.error(
    JSON.stringify({
      level: 'error',
      app: 'salgae-api',
      event,
      requestId,
      time: new Date().toISOString(),
      error: describeError(error),
    }),
  );
}
