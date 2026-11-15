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
