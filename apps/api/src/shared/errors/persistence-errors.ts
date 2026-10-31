/** O banco recusou a gravação porque o valor de um campo único já existe. */
export class UniqueViolationError extends Error {
  override readonly name = 'UniqueViolationError';
}

/** O banco recusou a exclusão porque outro registro ainda aponta para este. */
export class ReferencedRecordError extends Error {
  override readonly name = 'ReferencedRecordError';
}
