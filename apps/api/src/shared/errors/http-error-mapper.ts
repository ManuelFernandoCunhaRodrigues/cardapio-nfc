import type { FieldErrors } from '@salgae/core/contracts/admin-api';
import { HTTPException } from 'hono/http-exception';

import {
  ConflictError,
  type DomainError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from './domain-errors';

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 500 | 504;

type HttpError = {
  status: ErrorStatus;
  message: string;
  fieldErrors?: FieldErrors;
  report: boolean;
};

const domainErrorMappings: Array<{
  type: abstract new (...args: never[]) => DomainError;
  status: ErrorStatus;
}> = [
  { type: ValidationError, status: 400 },
  { type: UnauthorizedError, status: 401 },
  { type: ForbiddenError, status: 403 },
  { type: NotFoundError, status: 404 },
  { type: ConflictError, status: 409 },
  { type: PayloadTooLargeError, status: 413 },
  { type: UnsupportedMediaTypeError, status: 415 },
];

function findDomainMapping(error: Error) {
  return domainErrorMappings.find(({ type }) => error instanceof type);
}

export function mapErrorToHttp(error: Error): HttpError {
  const domainMapping = findDomainMapping(error);
  if (domainMapping) {
    const { fieldErrors } = error as DomainError;
    return {
      status: domainMapping.status,
      message: error.message,
      ...(fieldErrors ? { fieldErrors } : {}),
      report: false,
    };
  }

  if (error instanceof HTTPException && error.status === 504) {
    return { status: 504, message: 'A solicitação demorou mais que o esperado.', report: true };
  }

  return {
    status: 500,
    message: 'Não foi possível concluir a solicitação agora. Tente novamente.',
    report: true,
  };
}
