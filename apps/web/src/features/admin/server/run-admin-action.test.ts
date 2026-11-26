import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class RedirectSignal extends Error {
    constructor(readonly path: string) {
      super(`redirect ${path}`);
    }
  }
  return { reportServerError: vi.fn(), RedirectSignal };
});
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.reportServerError }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new mocks.RedirectSignal(path);
  },
  unstable_rethrow: (error: unknown) => {
    if (error instanceof mocks.RedirectSignal) throw error;
  },
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-salgae-current-path': '/admin/categorias?filtro=x' }),
}));

import { ADMIN_FORBIDDEN_MESSAGE, ApiRequestError } from '@/lib/api/api-request-error';

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

  it('leva ao login com o motivo e a volta para a tela quando a sessão venceu (401)', async () => {
    const result = runAdminAction(async () => {
      throw new ApiRequestError(401, 'Mensagem da API.');
    }, options);

    await expect(result).rejects.toMatchObject({
      path: '/admin/login?motivo=sessao&voltar=%2Fadmin%2Fcategorias%3Ffiltro%3Dx',
    });
    expect(mocks.reportServerError).not.toHaveBeenCalled();
  });

  it('avisa que a conta não tem acesso quando a API recusa a permissão (403)', async () => {
    const state = await runAdminAction(async () => {
      throw new ApiRequestError(403, 'Mensagem da API.');
    }, options);

    expect(state).toEqual({ status: 'error', message: ADMIN_FORBIDDEN_MESSAGE });
  });

  it('deixa passar o redirecionamento do Next lançado dentro da ação', async () => {
    const signal = new mocks.RedirectSignal('/admin/produtos');

    await expect(
      runAdminAction(async () => {
        throw signal;
      }, options),
    ).rejects.toBe(signal);
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
