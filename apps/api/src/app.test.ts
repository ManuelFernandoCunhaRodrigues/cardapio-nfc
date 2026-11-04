import type { User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app';
import type { ApiEnv } from './config/env';
import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from './shared/supabase/supabase-client-factory';

const env: ApiEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  WEB_ORIGIN: 'https://salgae.example',
};

type FakeClientOptions = {
  user?: User | null;
  authError?: Error | null;
  profile?: { role: string; is_active: boolean; name?: string | null } | null;
  profileError?: Error | null;
  healthError?: Error | null;
};

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'admin@salgae.example',
    ...overrides,
  } as User;
}

function createFakeClient(options: FakeClientOptions = {}): AppSupabaseClient {
  const profileQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.profile ?? { role: 'admin', is_active: true, name: 'Ana' },
      error: options.profileError ?? null,
    }),
  };
  profileQuery.select.mockReturnValue(profileQuery);
  profileQuery.eq.mockReturnValue(profileQuery);

  const healthQuery = {
    select: vi.fn(),
    limit: vi.fn(),
    retry: vi.fn(),
    abortSignal: vi.fn().mockResolvedValue({ error: options.healthError ?? null }),
  };
  healthQuery.select.mockReturnValue(healthQuery);
  healthQuery.limit.mockReturnValue(healthQuery);
  healthQuery.retry.mockReturnValue(healthQuery);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user === undefined ? fakeUser() : options.user },
        error: options.authError ?? null,
      }),
    },
    from: vi.fn((table: string) => (table === 'profiles' ? profileQuery : healthQuery)),
  } as unknown as AppSupabaseClient;
}

function createFakeFactory(options: FakeClientOptions = {}) {
  const client = createFakeClient(options);
  const factory: SupabaseClientFactory = {
    createPublicClient: vi.fn(() => client),
    createUserClient: vi.fn(() => client),
  };
  return { client, factory };
}

describe('HTTP middleware', () => {
  it('preserva um request id válido recebido', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/health',
      {
        headers: { 'x-request-id': 'checkout-123' },
      },
    );

    expect(response.headers.get('x-request-id')).toBe('checkout-123');
  });

  it('gera um request id quando o recebido é inválido', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/health',
      {
        headers: { 'x-request-id': 'id com espaços' },
      },
    );

    expect(response.headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('devolve erros no envelope usado pelo site', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/v1/admin/session',
    );

    expect(await response.json()).toEqual({
      status: 'error',
      message: 'Sua sessão expirou. Entre novamente.',
    });
  });

  it('devolve rotas ausentes no envelope de erro', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/unknown',
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      status: 'error',
      message: 'Recurso não encontrado.',
    });
  });

  it('permite CORS para a origem do site', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/health',
      {
        headers: { Origin: env.WEB_ORIGIN },
      },
    );

    expect(response.headers.get('access-control-allow-origin')).toBe(env.WEB_ORIGIN);
  });

  it('não permite CORS para outra origem', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/health',
      {
        headers: { Origin: 'https://attacker.example' },
      },
    );

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('não instala CORS quando a origem não é configurada', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ supabase: factory }).request('/health', {
      headers: { Origin: env.WEB_ORIGIN },
    });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('GET /v1/admin/session', () => {
  it('responde 401 quando o token não é enviado', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/v1/admin/session',
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(factory.createUserClient).not.toHaveBeenCalled();
  });

  it('responde 401 quando o Supabase rejeita o token', async () => {
    const { factory } = createFakeFactory({ authError: new Error('invalid token'), user: null });
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/v1/admin/session',
      {
        headers: { Authorization: 'Bearer invalid-token' },
      },
    );

    expect(response.status).toBe(401);
  });

  it('responde 401 quando o token não identifica um usuário', async () => {
    const { factory } = createFakeFactory({ user: null });
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/v1/admin/session',
      {
        headers: { Authorization: 'Bearer unknown-user-token' },
      },
    );

    expect(response.status).toBe(401);
  });

  it('responde 403 quando o perfil não é administrador', async () => {
    const { factory } = createFakeFactory({ profile: { role: 'viewer', is_active: true } });
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/v1/admin/session',
      {
        headers: { Authorization: 'Bearer user-token' },
      },
    );

    expect(response.status).toBe(403);
  });

  it('responde 403 quando o perfil administrador está inativo', async () => {
    const { factory } = createFakeFactory({ profile: { role: 'admin', is_active: false } });
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/v1/admin/session',
      {
        headers: { Authorization: 'Bearer user-token' },
      },
    );

    expect(response.status).toBe(403);
  });

  it('devolve a sessão do administrador ativo', async () => {
    const { client, factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/v1/admin/session',
      {
        headers: { Authorization: 'Bearer admin-token' },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      userId: 'user-123',
      email: 'admin@salgae.example',
      name: 'Ana',
      role: 'admin',
    });
    expect(factory.createUserClient).toHaveBeenCalledWith('admin-token');
    expect(client.auth.getUser).toHaveBeenCalledWith('admin-token');
  });

  it('não expõe o erro de banco ao consultar o perfil', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { factory } = createFakeFactory({ profileError: new Error('database details') });
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/v1/admin/session',
      {
        headers: { Authorization: 'Bearer admin-token' },
      },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      status: 'error',
      message: 'Não foi possível concluir a solicitação agora. Tente novamente.',
    });
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});

describe('GET /health', () => {
  it('responde 200 quando o Supabase responde', async () => {
    const { factory } = createFakeFactory();
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/health',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('responde 503 quando o Supabase não responde', async () => {
    const { factory } = createFakeFactory({ healthError: new Error('database unavailable') });
    const response = await createApp({ corsOrigin: env.WEB_ORIGIN, supabase: factory }).request(
      '/health',
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'error', message: 'Serviço indisponível.' });
  });
});
