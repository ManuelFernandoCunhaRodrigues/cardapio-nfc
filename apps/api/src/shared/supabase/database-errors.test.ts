import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { ReferencedRecordError, UniqueViolationError } from '../errors/persistence-errors.js';
import { translateDatabaseError } from './database-errors.js';

function postgrestError(code: string): PostgrestError {
  return Object.assign(new Error(`postgres ${code}`), {
    code,
    details: '',
    hint: '',
  }) as unknown as PostgrestError;
}

describe('translateDatabaseError', () => {
  it('traduz a violação de campo único', () => {
    expect(translateDatabaseError(postgrestError('23505'))).toBeInstanceOf(UniqueViolationError);
  });

  it('traduz a exclusão barrada por chave estrangeira', () => {
    expect(translateDatabaseError(postgrestError('23503'))).toBeInstanceOf(ReferencedRecordError);
  });

  it('devolve qualquer outro erro do banco sem alteração', () => {
    const error = postgrestError('42501');

    expect(translateDatabaseError(error)).toBe(error);
  });
});
