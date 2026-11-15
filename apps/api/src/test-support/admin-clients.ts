import type { User } from '@supabase/supabase-js';
import { vi } from 'vitest';

import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../shared/supabase/supabase-client-factory';

const ADMIN_TOKEN = 'admin-token';
/** Conta autenticada sem perfil de administrador: o Supabase aceita o token, o painel não. */
const NON_ADMIN_TOKEN = 'non-admin-token';

const users: Record<string, User> = {
  [ADMIN_TOKEN]: { id: 'admin-1', email: 'admin@salgae.test' } as User,
  [NON_ADMIN_TOKEN]: { id: 'user-1', email: 'cliente@salgae.test' } as User,
};

const profiles: Record<string, { role: string; is_active: boolean; name: string | null }> = {
  'admin-1': { role: 'admin', is_active: true, name: 'Ana' },
};

function fakeProfileQuery() {
  let userId = '';
  const query = {
    select: () => query,
    eq: (_column: string, value: string) => {
      userId = value;
      return query;
    },
    maybeSingle: async () => ({ data: profiles[userId] ?? null, error: null }),
  };
  return query;
}

/** Clientes falsos: `admin-token` é de um administrador ativo; `non-admin-token`, de uma conta comum. */
export function fakeAdminClients(): SupabaseClientFactory {
  const client = {
    auth: {
      getUser: vi.fn(async (token: string) =>
        users[token]
          ? { data: { user: users[token] }, error: null }
          : { data: { user: null }, error: new Error('invalid token') },
      ),
    },
    from: () => fakeProfileQuery(),
  } as unknown as AppSupabaseClient;
  return { createPublicClient: () => client, createUserClient: () => client };
}

function requestWithToken(token: string, method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export function adminRequest(method: string, body?: unknown): RequestInit {
  return requestWithToken(ADMIN_TOKEN, method, body);
}

export function nonAdminRequest(method: string, body?: unknown): RequestInit {
  return requestWithToken(NON_ADMIN_TOKEN, method, body);
}

export function anonymousRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}
