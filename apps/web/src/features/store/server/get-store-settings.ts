import { adminApiPaths, adminStoreResponseSchema } from '@salgae/core/contracts/admin-api';
import type { StoreSettings } from '@salgae/core/schemas/store-settings';

import { adminApi } from '@/lib/api/admin-api-client';
import { reportServerError } from '@/lib/observability';

/**
 * Dados da loja para o painel. Sem eles o painel continua usável (a tela da loja avisa e deixa
 * preencher de novo), então a falha é registrada e a resposta é `null` em vez de derrubar a tela.
 */
export async function getAdminStoreSettings(): Promise<StoreSettings | null> {
  try {
    return await adminApi().read(adminApiPaths.store, adminStoreResponseSchema);
  } catch (error) {
    reportServerError('admin_store_settings_read_failed', error);
    return null;
  }
}
