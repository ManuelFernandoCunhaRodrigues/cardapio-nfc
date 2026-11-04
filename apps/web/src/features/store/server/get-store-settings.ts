import { adminApiPaths, adminStoreResponseSchema } from '@salgae/core/contracts/admin-api';
import type { StoreSettings } from '@salgae/core/schemas/store-settings';

import { redirectIfSessionExpired } from '@/features/admin/server/session-redirect';
import { adminApi } from '@/lib/api/admin-api-client';
import { reportServerError } from '@/lib/observability';

export type AdminStoreSettingsResult =
  { status: 'loaded'; settings: StoreSettings } | { status: 'unavailable' };

/**
 * Dados da loja para o painel. A falha é registrada e vira um estado próprio: o resto do painel
 * continua usável e a tela da loja não abre um formulário vazio que sobrescreveria os dados.
 */
export async function getAdminStoreSettings(): Promise<AdminStoreSettingsResult> {
  try {
    const settings = await adminApi().read(adminApiPaths.store, adminStoreResponseSchema);
    return { status: 'loaded', settings };
  } catch (error) {
    redirectIfSessionExpired(error);
    reportServerError('admin_store_settings_read_failed', error);
    return { status: 'unavailable' };
  }
}
