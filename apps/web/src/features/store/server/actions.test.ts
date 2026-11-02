import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminActionMocks as mocks, formDataFrom } from '@/test-support/admin-action-mocks';

vi.mock('@/lib/api/admin-api-client', () =>
  import('@/test-support/admin-action-mocks').then((module) => module.adminApiModule),
);
vi.mock('@/lib/cache/invalidate-public-cache', () =>
  import('@/test-support/admin-action-mocks').then((module) => module.publicCacheModule),
);
vi.mock('@/lib/cache/refresh-admin-panel', () =>
  import('@/test-support/admin-action-mocks').then((module) => module.adminPanelCacheModule),
);

import { updateStoreSettings, updateStoreStatusOverride } from './actions';

beforeEach(() => vi.clearAllMocks());

describe('Server Actions da loja', () => {
  it('fecha a loja manualmente e mostra a frase do novo estado', async () => {
    mocks.write.mockResolvedValue(undefined);

    const state = await updateStoreStatusOverride(
      { status: 'idle' },
      formDataFrom({ status_override: 'closed' }),
    );

    expect(state).toEqual({ status: 'success', message: 'Loja fechada manualmente.' });
    expect(mocks.write).toHaveBeenCalledWith('PUT', '/v1/admin/store/status', {
      status_override: 'closed',
    });
    expect(mocks.invalidateStoreCache).toHaveBeenCalledOnce();
  });

  it('recusa estado desconhecido sem chamar a API', async () => {
    const state = await updateStoreStatusOverride(
      { status: 'idle' },
      formDataFrom({ status_override: 'talvez' }),
    );

    expect(state).toEqual({ status: 'error', message: 'Escolha um estado válido para a loja.' });
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it('manda os sete dias de horário montados a partir do formulário', async () => {
    mocks.write.mockResolvedValue(undefined);

    await updateStoreSettings(
      { status: 'idle' },
      formDataFrom({ name: 'Salgaê', status_override: 'auto', 'closed-0': 'on' }),
    );

    const [, path, body] = mocks.write.mock.calls[0] as [
      string,
      string,
      { opening_hours: unknown[] },
    ];
    expect(path).toBe('/v1/admin/store');
    expect(body.opening_hours).toHaveLength(7);
    expect(body.opening_hours[0]).toMatchObject({ day: 0, closed: true });
  });
});
