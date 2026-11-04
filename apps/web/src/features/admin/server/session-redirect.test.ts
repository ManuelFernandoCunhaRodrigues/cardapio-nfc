import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '@/lib/api/api-request-error';

import { redirectIfSessionExpired } from './session-redirect';

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect }));

describe('redirectIfSessionExpired', () => {
  beforeEach(() => redirect.mockClear());

  it('leva ao login quando a API recusa a sessão', () => {
    redirectIfSessionExpired(new ApiRequestError(401, 'Sessão expirada.'));
    expect(redirect).toHaveBeenCalledWith('/admin/login');
  });

  it.each([
    ['sem permissão', new ApiRequestError(403, 'Sem permissão.')],
    ['erro da API', new ApiRequestError(500, 'Falhou.')],
    ['erro comum', new Error('Falhou.')],
  ])('não leva ao login em %s', (_name, error) => {
    redirectIfSessionExpired(error);
    expect(redirect).not.toHaveBeenCalled();
  });
});
