import { describe, expect, it } from 'vitest';

import { ConflictError, NotFoundError } from './domain-errors';
import { UniqueViolationError } from './persistence-errors';
import { requireFound, withUniqueSlug } from './record-guards';

describe('requireFound', () => {
  it('devolve o valor encontrado', () => {
    expect(requireFound({ imagePath: null }, 'sumiu')).toEqual({ imagePath: null });
    expect(requireFound(true, 'sumiu')).toBe(true);
  });

  it.each([null, false])('transforma %s em não encontrado', (value) => {
    expect(() => requireFound(value, 'sumiu')).toThrow(new NotFoundError('sumiu'));
  });
});

describe('withUniqueSlug', () => {
  it('traduz o slug repetido em conflito no campo slug', async () => {
    const error = await withUniqueSlug(async () => {
      throw new UniqueViolationError('duplicate key');
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ fieldErrors: { slug: ['Esse endereço curto já está em uso.'] } });
  });

  it('repassa qualquer outro erro', async () => {
    const failure = new Error('rede');

    await expect(
      withUniqueSlug(async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
