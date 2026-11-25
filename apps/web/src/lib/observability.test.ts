import { afterEach, describe, expect, test, vi } from 'vitest';

import { describeError, reportServerError } from './observability';

describe('describeError', () => {
  test('lê os campos de um erro do Supabase, que chega como objeto simples', () => {
    expect(
      describeError({
        message: 'permission denied for table products',
        code: '42501',
        details: null,
        hint: '',
      }),
    ).toEqual({ message: 'permission denied for table products', code: '42501' });
  });

  test('mantém nome, mensagem e pilha de um Error', () => {
    const details = describeError(new TypeError('fetch failed'));
    expect(details).toMatchObject({ name: 'TypeError', message: 'fetch failed' });
    expect(details.stack).toContain('fetch failed');
  });

  test('leva o código do pedido da API para o log', () => {
    const error = Object.assign(new Error('Falhou.'), { requestId: 'req-123' });
    expect(describeError(error)).toMatchObject({ message: 'Falhou.', requestId: 'req-123' });
    expect(describeError(new Error('Sem código.'))).not.toHaveProperty('requestId');
  });

  test('converte valores que não são objeto', () => {
    expect(describeError('tempo esgotado')).toEqual({ message: 'tempo esgotado' });
    expect(describeError(undefined)).toEqual({ message: 'undefined' });
  });
});

describe('reportServerError', () => {
  afterEach(() => vi.restoreAllMocks());

  test('escreve uma linha JSON com o evento e o erro', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportServerError('product_create_failed', { message: 'duplicate key', code: '23505' });

    expect(log).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(log.mock.calls[0][0]));
    expect(line).toMatchObject({
      level: 'error',
      app: 'salgae',
      event: 'product_create_failed',
      error: { message: 'duplicate key', code: '23505' },
    });
    expect(Number.isNaN(Date.parse(line.time))).toBe(false);
  });
});
