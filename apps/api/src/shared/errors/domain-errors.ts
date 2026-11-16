import type { FieldErrors } from '@salgae/core/contracts/admin-api';

/** Erro esperado pela regra de negócio: a mensagem é segura para mostrar ao usuário. */
export abstract class DomainError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
  }
}

export class ValidationError extends DomainError {
  override readonly name = 'ValidationError';
}

export class UnauthorizedError extends DomainError {
  override readonly name = 'UnauthorizedError';
}

export class ForbiddenError extends DomainError {
  override readonly name = 'ForbiddenError';
}

export class NotFoundError extends DomainError {
  override readonly name = 'NotFoundError';
}

export class ConflictError extends DomainError {
  override readonly name = 'ConflictError';
}

/** O conteúdo enviado passa do que o servidor consegue guardar (a foto, por exemplo). */
export class PayloadTooLargeError extends DomainError {
  override readonly name = 'PayloadTooLargeError';
}

/** O formato do arquivo é reconhecido, mas o servidor não sabe processá-lo. */
export class UnsupportedMediaTypeError extends DomainError {
  override readonly name = 'UnsupportedMediaTypeError';
}

export class TimeoutError extends DomainError {
  override readonly name = 'TimeoutError';
}

export class ServiceError extends DomainError {
  override readonly name = 'ServiceError';
}
