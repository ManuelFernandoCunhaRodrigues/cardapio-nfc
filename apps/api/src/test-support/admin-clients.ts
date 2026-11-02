import type { User } from '@supabase/supabase-js';
import { vi } from 'vitest';

import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../shared/supabase/supabase-client-factory.js';

const ADMIN_TOKEN = 'admin-token';

/** Clientes falsos em que o token `admin-token` pertence a um administrador ativo. */
export function fakeAdminClients(): SupabaseClientFactory {
  const profileQuery = {
    select: () => profileQuery,
    eq: () => profileQuery,
    maybeSingle: async () => ({
      data: { role: 'admin', is_active: true, name: 'Ana' },
      error: null,
    }),
  };
  const client = {
    auth: {
      getUser: vi.fn(async (token: string) =>
        token === ADMIN_TOKEN
          ? { data: { user: { id: 'admin-1', email: 'admin@salgae.test' } as User }, error: null }
          : { data: { user: null }, error: new Error('invalid token') },
      ),
    },
    from: () => profileQuery,
  } as unknown as AppSupabaseClient;
  return { createPublicClient: () => client, createUserClient: () => client };
}

export function adminRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}
