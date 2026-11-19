import type { FieldErrors } from '@salgae/core/contracts/admin-api';
import type { Context } from 'hono';

import type { AppHonoEnv } from '../types';

/** Mantém o envelope de erro e o identificador de suporte iguais em toda a API. */
export function errorResponse(
  context: Context<AppHonoEnv>,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 500 | 503 | 504,
  message: string,
  fieldErrors?: FieldErrors,
) {
  const requestId = context.get('requestId');
  return context.json(
    {
      status: 'error' as const,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
      ...(requestId ? { requestId } : {}),
    },
    status,
  );
}
