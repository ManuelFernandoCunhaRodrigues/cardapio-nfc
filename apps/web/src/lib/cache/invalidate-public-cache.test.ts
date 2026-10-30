import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ updateTag: vi.fn() }));

vi.mock('next/cache', () => ({ updateTag: mocks.updateTag }));

import { invalidateMenuCache, invalidateStoreCache } from './invalidate-public-cache';

beforeEach(() => mocks.updateTag.mockClear());

describe('public cache invalidation', () => {
  it('invalidates the menu and requested product tags', () => {
    invalidateMenuCache('coxinha-de-frango');

    expect(mocks.updateTag).toHaveBeenNthCalledWith(1, 'menu');
    expect(mocks.updateTag).toHaveBeenNthCalledWith(2, 'product:coxinha-de-frango');
  });

  it('invalidates the store tag', () => {
    invalidateStoreCache();

    expect(mocks.updateTag).toHaveBeenCalledWith('store');
  });
});
