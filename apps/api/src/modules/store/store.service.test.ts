import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../shared/errors/domain-errors.js';
import { StoreService } from './store.service.js';
import { storeSettingsFixture } from './store.test-fixture.js';

describe('StoreService', () => {
  it('returns settings validated by the public contract', async () => {
    const service = new StoreService({ findPublicSettings: async () => storeSettingsFixture });

    await expect(service.getPublicSettings()).resolves.toEqual(storeSettingsFixture);
  });

  it('throws NotFoundError when the singleton row is absent', async () => {
    const service = new StoreService({ findPublicSettings: async () => null });

    await expect(service.getPublicSettings()).rejects.toBeInstanceOf(NotFoundError);
  });
});
