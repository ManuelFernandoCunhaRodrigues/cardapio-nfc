import type { ErrorHandler } from 'hono';

import type { AppHonoEnv } from '../types.js';
import { mapErrorToHttp } from '../errors/http-error-mapper.js';
import { reportServerError } from '../observability.js';

export const errorHandler: ErrorHandler<AppHonoEnv> = (error, context) => {
  const httpError = mapErrorToHttp(error);
  if (httpError.report) {
    reportServerError({
      event: 'http.request.failed',
      error,
      requestId: context.get('requestId'),
    });
  }
  return context.json({ status: 'error' as const, message: httpError.message }, httpError.status);
};
