import { vi } from 'vitest';

/**
 * Dublês do cliente da API e da invalidação de cache usados pelas Server Actions do painel.
 * Cada teste liga os módulos com `vi.mock(..., () => import('@/test-support/admin-action-mocks')
 * .then((mocks) => mocks.<módulo>))`, porque a fábrica do `vi.mock` roda antes dos imports.
 */
export const adminActionMocks = {
  create: vi.fn(),
  write: vi.fn(),
  upload: vi.fn(),
  invalidateMenuCache: vi.fn(),
  invalidateStoreCache: vi.fn(),
  refreshAdminPanel: vi.fn(),
  refreshAdminList: vi.fn(),
};

export const adminApiModule = {
  adminApi: () => ({
    create: adminActionMocks.create,
    write: adminActionMocks.write,
    upload: adminActionMocks.upload,
  }),
};

export const publicCacheModule = {
  invalidateMenuCache: adminActionMocks.invalidateMenuCache,
  invalidateStoreCache: adminActionMocks.invalidateStoreCache,
};

export const adminPanelCacheModule = {
  refreshAdminPanel: adminActionMocks.refreshAdminPanel,
  refreshAdminList: adminActionMocks.refreshAdminList,
};

export function formDataFrom(fields: Record<string, string | File>): FormData {
  const formData = new FormData();
  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  return formData;
}
