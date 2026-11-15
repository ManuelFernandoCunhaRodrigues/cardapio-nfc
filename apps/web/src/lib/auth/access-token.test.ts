import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getClaims: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }));

import { getAccessToken } from './access-token';

const session = { access_token: 'token-do-admin' };

beforeEach(() => vi.clearAllMocks());

describe('getAccessToken', () => {
  it('devolve o token depois de conferir a assinatura, sem consultar o usuário no Auth', async () => {
    auth.getSession.mockResolvedValue({ data: { session } });
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'admin' } }, error: null });

    await expect(getAccessToken()).resolves.toBe('token-do-admin');
    expect(auth.getClaims).toHaveBeenCalledWith('token-do-admin');
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it('devolve null sem sessão e nem tenta conferir o token', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(getAccessToken()).resolves.toBeNull();
    expect(auth.getClaims).not.toHaveBeenCalled();
  });

  it('devolve null quando o token não passa na conferência', async () => {
    auth.getSession.mockResolvedValue({ data: { session } });
    auth.getClaims.mockResolvedValue({ data: null, error: new Error('Invalid JWT signature') });

    await expect(getAccessToken()).resolves.toBeNull();
  });
});
