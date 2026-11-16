import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '@/lib/api/api-request-error';

import { redirectIfSessionExpired, redirectIfSessionExpiredForRequest } from './session-redirect';

const mocks = vi.hoisted(() => ({ redirect: vi.fn(), currentPath: '/admin/produtos/123' }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-salgae-current-path': mocks.currentPath }),
}));

const notExpired = [
  ['sem permissão', new ApiRequestError(403, 'Sem permissão.')],
  ['erro da API', new ApiRequestError(500, 'Falhou.')],
  ['erro comum', new Error('Falhou.')],
] as const;

beforeEach(() => {
  mocks.redirect.mockClear();
  mocks.currentPath = '/admin/produtos/123';
});

describe('redirectIfSessionExpiredForRequest', () => {
  it('leva ao login com o motivo e a volta para a tela atual', async () => {
    await redirectIfSessionExpiredForRequest(new ApiRequestError(401, 'Sessão expirada.'));
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/admin/login?motivo=sessao&voltar=%2Fadmin%2Fprodutos%2F123',
    );
  });

  it('ignora um cabeçalho que aponte para fora do painel', async () => {
    mocks.currentPath = '//site.example/admin';
    await redirectIfSessionExpiredForRequest(new ApiRequestError(401, 'Sessão expirada.'));
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/login?motivo=sessao');
  });

  it.each(notExpired)('não leva ao login em %s', async (_name, error) => {
    await redirectIfSessionExpiredForRequest(error);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe('redirectIfSessionExpired', () => {
  it('leva ao login com o motivo quando a API recusa a sessão', () => {
    redirectIfSessionExpired(new ApiRequestError(401, 'Sessão expirada.'));
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/login?motivo=sessao');
  });

  it.each(notExpired)('não leva ao login em %s', (_name, error) => {
    redirectIfSessionExpired(error);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
