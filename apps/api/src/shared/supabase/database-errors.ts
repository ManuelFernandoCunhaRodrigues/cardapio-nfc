import type { PostgrestError } from '@supabase/supabase-js';

import { ReferencedRecordError, UniqueViolationError } from '../errors/persistence-errors';

const POSTGRES_UNIQUE_VIOLATION = '23505';
const POSTGRES_FOREIGN_KEY_VIOLATION = '23503';

/** Troca os códigos do Postgres que a regra de negócio trata por erros com nome próprio. */
export function translateDatabaseError(error: PostgrestError): Error {
  if (error.code === POSTGRES_UNIQUE_VIOLATION) {
    return new UniqueViolationError(error.message, { cause: error });
  }
  if (error.code === POSTGRES_FOREIGN_KEY_VIOLATION) {
    return new ReferencedRecordError(error.message, { cause: error });
  }
  return error;
}
