import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect as baseExpect, test as base, type Page } from '@playwright/test';

import type { Database } from '@salgae/core/database/database.types';
import { watchCspViolations } from './csp';
import { requiredEnv } from './env';

export type { APIRequestContext, Page, Request } from '@playwright/test';

type CleanupTable = 'products' | 'highlights' | 'categories';
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

export type AdminDb = {
  client: SupabaseClient<Database>;
  track: (table: CleanupTable, id: string) => void;
};

type Fixtures = {
  adminDb: AdminDb;
  uniqueName: (prefixo: string) => string;
  cspCheck: void;
};

export async function withStoreSettingsRestored<T>(
  adminDb: AdminDb,
  operation: (settings: StoreSettings) => Promise<T>,
): Promise<T> {
  const { data: settings, error: readError } = await adminDb.client
    .from('store_settings')
    .select('*')
    .limit(1)
    .single();
  if (readError)
    throw new Error(`Não foi possível fotografar store_settings: ${readError.message}`);

  try {
    return await operation(settings);
  } finally {
    const { error: restoreError } = await adminDb.client
      .from('store_settings')
      .update(settings)
      .eq('id', settings.id);
    if (restoreError)
      throw new Error(`Não foi possível restaurar store_settings: ${restoreError.message}`);
  }
}

/** Conteúdo em streaming ainda escondido, à espera de o React trocá-lo pelo `loading.tsx`. */
const PENDING_STREAMED_CONTENT = 'body > div[hidden][id^="S:"]';
const STREAMING_REVEAL_TIMEOUT_MS = 5_000;

/**
 * Depois do evento `load`, o conteúdo das páginas com `loading.tsx` ainda pode estar numa cópia
 * escondida (`<div hidden id="S:0">`), e o React mais novo do Next 16.4.6 adia a troca por alguns
 * instantes. Nesse intervalo cada elemento existe duas vezes no DOM, e os localizadores estritos que
 * não usam papel acessível acham dois. Esperar a troca aqui vale para todos os testes. Se a cópia
 * não sumir no prazo (raro), o teste segue e os localizadores decidem.
 */
async function waitForStreamedContentReveal(page: Page) {
  await page
    .waitForFunction((selector) => !document.querySelector(selector), PENDING_STREAMED_CONTENT, {
      timeout: STREAMING_REVEAL_TIMEOUT_MS,
    })
    .catch(() => undefined);
}

export const test = base.extend<Fixtures>({
  page: async ({ page }, provideFixture) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (...args) => {
      const response = await goto(...args);
      await waitForStreamedContentReveal(page);
      return response;
    };
    page.reload = async (...args) => {
      const response = await reload(...args);
      await waitForStreamedContentReveal(page);
      return response;
    };
    await provideFixture(page);
  },

  cspCheck: [
    async ({ page }, provideFixture) => {
      const violations = watchCspViolations(page);
      try {
        await provideFixture();
      } finally {
        baseExpect(violations, 'recursos bloqueados pela CSP').toEqual([]);
      }
    },
    { auto: true },
  ],

  uniqueName: async ({}, provideFixture, testInfo) => {
    const shortTestId = testInfo.testId.replace(/[^a-z0-9]/gi, '').slice(-8) || 'test';
    await provideFixture(
      (prefixo) =>
        `E2E-${prefixo}-${shortTestId}-${testInfo.retry}-${crypto.randomUUID().slice(0, 8)}`,
    );
  },

  adminDb: async ({}, provideFixture) => {
    const client = createClient<Database>(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: signInError } = await client.auth.signInWithPassword({
      email: requiredEnv('E2E_ADMIN_EMAIL'),
      password: requiredEnv('E2E_ADMIN_PASSWORD'),
    });
    if (signInError) throw new Error(`Login do adminDb falhou: ${signInError.message}`);

    const tracked: Record<CleanupTable, Set<string>> = {
      products: new Set(),
      highlights: new Set(),
      categories: new Set(),
    };
    const adminDb: AdminDb = {
      client,
      track: (table, id) => tracked[table].add(id),
    };

    const cleanupErrors: string[] = [];
    try {
      await provideFixture(adminDb);
    } finally {
      for (const table of ['products', 'highlights', 'categories'] as const) {
        const ids = [...tracked[table]];
        if (!ids.length) continue;
        try {
          const { error } = await client.from(table).delete().in('id', ids);
          if (error) cleanupErrors.push(`${table}: ${error.message}`);
        } catch (error) {
          cleanupErrors.push(`${table}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      baseExpect(cleanupErrors, 'falhas na limpeza do adminDb').toEqual([]);
    }
  },
});

export const expect = baseExpect;
