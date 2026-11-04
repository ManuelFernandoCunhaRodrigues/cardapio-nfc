import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createEmbeddedApiMock, getSupabaseEnvMock, appFetchMock } = vi.hoisted(() => ({
  createEmbeddedApiMock: vi.fn(),
  getSupabaseEnvMock: vi.fn(),
  appFetchMock: vi.fn(),
}));

vi.mock('@salgae/api/embedded', () => ({ createEmbeddedApi: createEmbeddedApiMock }));
vi.mock('@/lib/env', () => ({ getSupabaseEnv: getSupabaseEnvMock }));

async function loadAdapter() {
  return import('./embedded-api');
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  getSupabaseEnvMock.mockReturnValue({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  });
  createEmbeddedApiMock.mockReturnValue({ fetch: appFetchMock });
  appFetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

describe('embedded API adapter', () => {
  it('lê o ambiente só na primeira chamada e reutiliza o app', async () => {
    const { embeddedApiFetch } = await loadAdapter();
    expect(getSupabaseEnvMock).not.toHaveBeenCalled();

    await embeddedApiFetch('/health');
    await embeddedApiFetch('/health');

    expect(getSupabaseEnvMock).toHaveBeenCalledOnce();
    expect(createEmbeddedApiMock).toHaveBeenCalledOnce();
    expect(createEmbeddedApiMock).toHaveBeenCalledWith({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });
  });

  it('resolve caminhos relativos contra a origem interna absoluta', async () => {
    const { embeddedApiFetch } = await loadAdapter();

    await embeddedApiFetch('/v1/menu?categoria=salgados');

    const request = appFetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe('http://embedded-api.internal/v1/menu?categoria=salgados');
  });

  it.each(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])(
    'remove /api e preserva o método %s e os headers',
    async (method) => {
      const { handleApiRoute } = await loadAdapter();
      const request = new Request('https://salgae.test/api/v1/resource?active=1', {
        method,
        headers: { Authorization: 'Bearer token', 'X-Request-Id': 'request-123' },
        ...(method === 'GET' || method === 'HEAD' ? {} : { body: 'content' }),
      });

      await handleApiRoute(request);

      const forwarded = appFetchMock.mock.calls[0]?.[0] as Request;
      expect(forwarded.url).toBe('http://embedded-api.internal/v1/resource?active=1');
      expect(forwarded.method).toBe(method);
      expect(forwarded.headers.get('authorization')).toBe('Bearer token');
      expect(forwarded.headers.get('x-request-id')).toBe('request-123');
    },
  );

  it('preserva FormData sem definir Content-Type manualmente', async () => {
    const { handleApiRoute } = await loadAdapter();
    const body = new FormData();
    body.set('name', 'Coxinha');

    await handleApiRoute(
      new Request('https://salgae.test/api/v1/admin/products', { method: 'POST', body }),
    );

    const forwarded = appFetchMock.mock.calls[0]?.[0] as Request;
    expect((await forwarded.formData()).get('name')).toBe('Coxinha');
    expect(forwarded.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('rejeita caminhos fora do prefixo /api', async () => {
    const { handleApiRoute } = await loadAdapter();

    expect(() => handleApiRoute(new Request('https://salgae.test/api-invalida'))).toThrow(
      'exige o prefixo /api',
    );
    expect(createEmbeddedApiMock).not.toHaveBeenCalled();
  });
});
