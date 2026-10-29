import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect as baseExpect, test as base } from '@playwright/test';

import type { Database } from '../lib/supabase/database.types';
import { watchCspViolations } from './csp';

export type { APIRequestContext, Page } from '@playwright/test';

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

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} para executar os testes E2E.`);
  return value;
}

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

export const test = base.extend<Fixtures>({
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
