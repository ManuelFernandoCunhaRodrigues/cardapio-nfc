import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  MissingReferenceError,
  ReferencedRecordError,
  UniqueViolationError,
} from '../errors/persistence-errors';
import { translateDatabaseError } from './database-errors';

function postgrestError(code: string): PostgrestError {
  return Object.assign(new Error(`postgres ${code}`), {
    code,
    details: '',
    hint: '',
  }) as unknown as PostgrestError;
}

describe('translateDatabaseError', () => {
  it('traduz a violação de campo único', () => {
    expect(translateDatabaseError(postgrestError('23505'), 'save')).toBeInstanceOf(
      UniqueViolationError,
    );
  });

  it('traduz a exclusão barrada por chave estrangeira', () => {
    expect(translateDatabaseError(postgrestError('23503'), 'delete')).toBeInstanceOf(
      ReferencedRecordError,
    );
  });

  it('traduz a gravação que aponta para registro inexistente', () => {
    expect(translateDatabaseError(postgrestError('23503'), 'save')).toBeInstanceOf(
      MissingReferenceError,
    );
  });

  it('devolve qualquer outro erro do banco sem alteração', () => {
    const error = postgrestError('42501');

    expect(translateDatabaseError(error, 'save')).toBe(error);
  });
});
