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

  it.each([401, 403])(
    'pede para entrar de novo quando a API recusa a sessão (%i)',
    async (status) => {
      const state = await runAdminAction(async () => {
        throw new ApiRequestError(status, 'Mensagem da API.');
      }, options);

      expect(state).toEqual({
        status: 'error',
        message: 'Sua sessão não permite esta alteração. Entre novamente.',
      });
    },
  );

  it('registra a falha inesperada e mostra o texto da ação', async () => {
    const failure = new TypeError('fetch failed');

    const state = await runAdminAction(async () => {
      throw failure;
    }, options);

    expect(state).toEqual({ status: 'error', message: 'Tente novamente.' });
    expect(mocks.reportServerError).toHaveBeenCalledWith('category_create_failed', failure);
  });

  it('devolve o que foi digitado em qualquer erro, para o formulário não apagar os campos', async () => {
    const submitted = new FormData();
    submitted.set('name', 'Coxinhas');
    submitted.set('slug', 'url invalida');

    const rejected = await runAdminAction(
      async () => {
        throw new ApiRequestError(400, 'Revise os campos.', { slug: ['Inválido.'] });
      },
      { ...options, submitted },
    );
    const failed = await runAdminAction(
      async () => {
        throw new TypeError('fetch failed');
      },
      { ...options, submitted },
    );

    const values = { name: 'Coxinhas', slug: 'url invalida' };
    expect(rejected).toEqual({
      status: 'error',
      message: 'Revise os campos.',
      fieldErrors: { slug: ['Inválido.'] },
      values,
    });
    expect(failed).toEqual({ status: 'error', message: 'Tente novamente.', values });
  });

  it('não devolve os campos enviados quando a ação dá certo', async () => {
    const submitted = new FormData();
    submitted.set('name', 'Coxinhas');

    await expect(
      runAdminAction(async () => ({ status: 'success' }), { ...options, submitted }),
    ).resolves.toEqual({ status: 'success' });
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
