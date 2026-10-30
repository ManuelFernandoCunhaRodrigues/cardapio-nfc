export class ValidationError extends Error {
  override readonly name = 'ValidationError';
}

export class UnauthorizedError extends Error {
  override readonly name = 'UnauthorizedError';
}

export class ForbiddenError extends Error {
  override readonly name = 'ForbiddenError';
}

export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';
}

export class ConflictError extends Error {
  override readonly name = 'ConflictError';
}
