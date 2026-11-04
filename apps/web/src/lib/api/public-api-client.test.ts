import { describe, expect, it, vi } from 'vitest';

const { unstableCacheMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn((fetchData: () => Promise<unknown>) => fetchData),
}));

vi.mock('next/cache', () => ({ unstable_cache: unstableCacheMock }));
vi.mock('react', () => ({ cache: (callback: unknown) => callback }));

import { createPublicApiClient, getPublicProduct } from './public-api-client';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('public API client', () => {
  it('usa o caminho relativo da API embutida', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ categories: [], products: [], highlights: [] }));
    const client = createPublicApiClient({ fetchImplementation });

    await client.getMenu();

    expect(fetchImplementation).toHaveBeenCalledWith('/v1/menu');
  });

  it('mantém 60 segundos e as tags das leituras públicas', async () => {
    // As funções cacheadas são criadas ao importar o módulo.
    vi.resetModules();
    await import('./public-api-client');

    expect(unstableCacheMock).toHaveBeenCalledWith(expect.any(Function), ['public-menu'], {
      revalidate: 60,
      tags: ['menu'],
    });
    expect(unstableCacheMock).toHaveBeenCalledWith(expect.any(Function), ['public-store'], {
      revalidate: 60,
      tags: ['store'],
    });
  });

  it('cria chave e tags específicas para cada produto', async () => {
    unstableCacheMock.mockImplementationOnce(() => vi.fn().mockResolvedValue(null));

    await getPublicProduct('coxinha-frango');

    expect(unstableCacheMock).toHaveBeenLastCalledWith(
      expect.any(Function),
      ['public-product', 'coxinha-frango'],
      { revalidate: 60, tags: ['menu', 'product:coxinha-frango'] },
    );
  });

  it('lança erro quando a API responde com falha de servidor', async () => {
    const client = createPublicApiClient({
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(response({}, 503)),
    });

    await expect(client.getMenu()).rejects.toThrow('status 503');
  });

  it('propaga erros do transporte embutido', async () => {
    const client = createPublicApiClient({
      fetchImplementation: vi.fn<typeof fetch>().mockRejectedValue(new Error('database offline')),
    });

    await expect(client.getStore()).rejects.toThrow('database offline');
  });

  it('lança erro quando o JSON foge do contrato', async () => {
    const client = createPublicApiClient({
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(response({ products: [] })),
    });

    await expect(client.getMenu()).rejects.toThrow();
  });

  it('retorna null somente para produto ausente', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(response({}, 404));
    const client = createPublicApiClient({ fetchImplementation });

    await expect(client.getProduct('ausente')).resolves.toBeNull();
    expect(fetchImplementation).toHaveBeenCalledWith('/v1/menu/products/ausente');
  });
});
