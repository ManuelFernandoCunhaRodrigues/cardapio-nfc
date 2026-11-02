import { describe, expect, it, vi } from 'vitest';

import { createPublicApiClient } from './public-api-client';

const apiUrl = 'https://api.salgae.test';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('public API client', () => {
  it('sends the menu cache tag and 60 second revalidation', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ categories: [], products: [], highlights: [] }));
    const client = createPublicApiClient({ apiUrl, fetchImplementation });

    await client.getMenu();

    expect(fetchImplementation).toHaveBeenCalledWith(`${apiUrl}/v1/menu`, {
      next: { revalidate: 60, tags: ['menu'] },
      signal: expect.any(AbortSignal),
    });
  });

  it('throws when the API responds with a server error', async () => {
    const client = createPublicApiClient({
      apiUrl,
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(response({}, 503)),
    });

    await expect(client.getMenu()).rejects.toThrow('status 503');
  });

  it('propagates network errors', async () => {
    const client = createPublicApiClient({
      apiUrl,
      fetchImplementation: vi.fn<typeof fetch>().mockRejectedValue(new Error('connection refused')),
    });

    await expect(client.getStore()).rejects.toThrow('connection refused');
  });

  it('throws when JSON is outside the response contract', async () => {
    const client = createPublicApiClient({
      apiUrl,
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(response({ products: [] })),
    });

    await expect(client.getMenu()).rejects.toThrow();
  });

  it('returns null only for a product 404', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(response({}, 404));
    const client = createPublicApiClient({ apiUrl, fetchImplementation });

    await expect(client.getProduct('ausente')).resolves.toBeNull();
    expect(fetchImplementation).toHaveBeenCalledWith(
      `${apiUrl}/v1/menu/products/ausente`,
      expect.objectContaining({
        next: { revalidate: 60, tags: ['menu', 'product:ausente'] },
      }),
    );
  });
});
