import type { PostgrestError } from '@supabase/supabase-js';

import {
  MissingReferenceError,
  ReferencedRecordError,
  UniqueViolationError,
} from '../errors/persistence-errors';

const POSTGRES_UNIQUE_VIOLATION = '23505';
const POSTGRES_FOREIGN_KEY_VIOLATION = '23503';

/**
 * A mesma violação de chave estrangeira significa coisas opostas conforme a operação: na gravação,
 * o registro apontado não existe; na exclusão, outro registro ainda aponta para este.
 */
type WriteOperation = 'save' | 'delete';

/** Troca os códigos do Postgres que a regra de negócio trata por erros com nome próprio. */
export function translateDatabaseError(error: PostgrestError, operation: WriteOperation): Error {
  if (error.code === POSTGRES_UNIQUE_VIOLATION) {
    return new UniqueViolationError(error.message, { cause: error });
  }
  if (error.code === POSTGRES_FOREIGN_KEY_VIOLATION) {
    return operation === 'save'
      ? new MissingReferenceError(error.message, { cause: error })
      : new ReferencedRecordError(error.message, { cause: error });
  }
  return error;
}
