import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../shared/errors/domain-errors';
import { StoreService, type StoreRepository } from './store.service';
import { storeSettingsFixture } from './store.test-fixture';

function fakeRepository(overrides: Partial<StoreRepository> = {}): StoreRepository {
  return {
    findSettings: async () => storeSettingsFixture,
    updateSettings: vi.fn(async () => true),
    ...overrides,
  };
}

describe('StoreService', () => {
  it('devolve as configurações validadas pelo contrato', async () => {
    const service = new StoreService(fakeRepository());

    await expect(service.getSettings()).resolves.toEqual(storeSettingsFixture);
  });

  it('avisa quando a linha única de configurações não existe', async () => {
    const service = new StoreService(fakeRepository({ findSettings: async () => null }));

    await expect(service.getSettings()).rejects.toBeInstanceOf(NotFoundError);
  });

  it('grava só o estado manual da loja', async () => {
    const repository = fakeRepository();
    const service = new StoreService(repository);

    await service.updateStatusOverride({ status_override: 'closed' });

    expect(repository.updateSettings).toHaveBeenCalledWith({ status_override: 'closed' });
  });

  it('não finge sucesso quando nenhuma linha foi atualizada', async () => {
    const service = new StoreService(fakeRepository({ updateSettings: async () => false }));

    await expect(service.updateStatusOverride({ status_override: 'auto' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
