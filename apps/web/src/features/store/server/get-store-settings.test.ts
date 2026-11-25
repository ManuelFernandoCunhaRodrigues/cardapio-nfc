import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '@/lib/api/api-request-error';

const mocks = vi.hoisted(() => ({ read: vi.fn(), report: vi.fn(), isAdmin: vi.fn() }));

vi.mock('@/lib/api/admin-api-client', () => ({ adminApi: () => ({ read: mocks.read }) }));
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.report }));
vi.mock('@/features/auth/server/require-admin', () => ({ isAuthorizedAdmin: mocks.isAdmin }));

import { getAdminStoreSettings } from './get-store-settings';

beforeEach(() => vi.clearAllMocks());

describe('getAdminStoreSettings', () => {
  it('entrega os dados da loja lidos da API', async () => {
    const settings = { name: 'Salgaê' };
    mocks.read.mockResolvedValue(settings);

    await expect(getAdminStoreSettings()).resolves.toEqual({ status: 'loaded', settings });
  });

  it('registra a falha da API e deixa o painel seguir sem os dados', async () => {
    const failure = new ApiRequestError(500, 'Falha interna.');
    mocks.read.mockRejectedValue(failure);

    await expect(getAdminStoreSettings()).resolves.toEqual({ status: 'unavailable' });
    expect(mocks.report).toHaveBeenCalledWith('admin_store_settings_read_failed', failure);
  });

  it('não registra como falha o acesso negado a quem não é admin', async () => {
    mocks.read.mockRejectedValue(new ApiRequestError(403, 'Sem permissão.'));
    mocks.isAdmin.mockResolvedValue(false);

    await expect(getAdminStoreSettings()).resolves.toEqual({ status: 'unavailable' });
    expect(mocks.report).not.toHaveBeenCalled();
  });

  it('registra o 403 recebido por um admin autorizado, que é defeito', async () => {
    const failure = new ApiRequestError(403, 'Sem permissão.');
    mocks.read.mockRejectedValue(failure);
    mocks.isAdmin.mockResolvedValue(true);

    await expect(getAdminStoreSettings()).resolves.toEqual({ status: 'unavailable' });
    expect(mocks.report).toHaveBeenCalledWith('admin_store_settings_read_failed', failure);
  });
});
