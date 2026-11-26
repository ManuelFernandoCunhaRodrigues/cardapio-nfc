import type { ErrorHandler } from 'hono';

import type { AppHonoEnv } from '../types';
import { mapErrorToHttp } from '../errors/http-error-mapper';
import { reportServerError } from '../observability';
import { errorResponse } from './error-response';

export const errorHandler: ErrorHandler<AppHonoEnv> = (error, context) => {
  const httpError = mapErrorToHttp(error);
  if (httpError.report) {
    reportServerError({
      event: 'http.request.failed',
      error,
      requestId: context.get('requestId'),
    });
  }
  const { status, message, fieldErrors } = httpError;
  return errorResponse(context, status, message, fieldErrors);
};
