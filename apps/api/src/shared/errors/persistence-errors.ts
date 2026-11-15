/** O banco recusou a gravação porque o valor de um campo único já existe. */
export class UniqueViolationError extends Error {
  override readonly name = 'UniqueViolationError';
}

/** O banco recusou a exclusão porque outro registro ainda aponta para este. */
export class ReferencedRecordError extends Error {
  override readonly name = 'ReferencedRecordError';
}

/** O banco recusou a gravação porque o registro apontado (a categoria, por exemplo) não existe. */
export class MissingReferenceError extends Error {
  override readonly name = 'MissingReferenceError';
}
