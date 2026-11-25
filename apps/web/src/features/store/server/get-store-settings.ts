import { adminApiPaths, adminStoreResponseSchema } from '@salgae/core/contracts/admin-api';
import type { StoreSettings } from '@salgae/core/schemas/store-settings';
import { cache } from 'react';

import { redirectIfSessionExpired } from '@/features/admin/server/session-redirect';
import { isAuthorizedAdmin } from '@/features/auth/server/require-admin';
import { adminApi } from '@/lib/api/admin-api-client';
import { ApiRequestError } from '@/lib/api/api-request-error';
import { reportServerError } from '@/lib/observability';

export type AdminStoreSettingsResult =
  { status: 'loaded'; settings: StoreSettings } | { status: 'unavailable' };

/**
 * Dados da loja para o painel. A falha é registrada e vira um estado próprio: o resto do painel
 * continua usável e a tela da loja não abre um formulário vazio que sobrescreveria os dados.
 * O layout e as telas de Resumo e Loja pedem os mesmos dados; `cache` faz uma leitura só.
 */
export const getAdminStoreSettings = cache(async (): Promise<AdminStoreSettingsResult> => {
  try {
    const settings = await adminApi().read(adminApiPaths.store, adminStoreResponseSchema);
    return { status: 'loaded', settings };
  } catch (error) {
    redirectIfSessionExpired(error);
    // O layout lê a loja junto com a autorização; quem não é admin recebe 403 e vê o aviso de acesso
    // negado, o que não é falha a registrar. 403 para um admin autorizado é defeito e vai ao log.
    // A autorização está em `cache`: perguntar de novo não faz outra chamada à API.
    const forbidden = error instanceof ApiRequestError && error.status === 403;
    if (!forbidden || (await isAuthorizedAdmin())) {
      reportServerError('admin_store_settings_read_failed', error);
    }
    return { status: 'unavailable' };
  }
});
