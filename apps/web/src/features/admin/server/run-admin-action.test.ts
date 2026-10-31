import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ reportServerError: vi.fn() }));
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.reportServerError }));

import { ApiRequestError } from '@/lib/api/api-request-error';

import { readFormText, runAdminAction } from './run-admin-action';

const options = { event: 'category_create_failed', failureMessage: 'Tente novamente.' };

beforeEach(() => mocks.reportServerError.mockClear());

describe('runAdminAction', () => {
  it('devolve o resultado de sucesso da ação', async () => {
    await expect(runAdminAction(async () => ({ status: 'success' }), options)).resolves.toEqual({
      status: 'success',
    });
  });

  it('mostra a mensagem e os campos de um erro esperado da API sem registrar', async () => {
    const state = await runAdminAction(async () => {
      throw new ApiRequestError(409, 'Endereço em uso.', { slug: ['Em uso.'] });
    }, options);

    expect(state).toEqual({
      status: 'error',
      message: 'Endereço em uso.',
      fieldErrors: { slug: ['Em uso.'] },
    });
    expect(mocks.reportServerError).not.toHaveBeenCalled();
  });

  it('registra a falha inesperada e mostra o texto da ação', async () => {
    const failure = new TypeError('fetch failed');

    const state = await runAdminAction(async () => {
      throw failure;
    }, options);

    expect(state).toEqual({ status: 'error', message: 'Tente novamente.' });
    expect(mocks.reportServerError).toHaveBeenCalledWith('category_create_failed', failure);
  });
});

describe('readFormText', () => {
  it('lê texto e trata campo ausente como vazio', () => {
    const formData = new FormData();
    formData.set('name', 'Coxinhas');

    expect(readFormText(formData, 'name')).toBe('Coxinhas');
    expect(readFormText(formData, 'slug')).toBe('');
  });
});
