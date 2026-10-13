import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTimeoutFetch, PUBLIC_FETCH_TIMEOUT_MS } from './public';

describe('createTimeoutFetch', () => {
  afterEach(() => vi.useRealTimers());

  it('aborta a leitura quando excede o tempo limite', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));
    const fetchWithTimeout = createTimeoutFetch(fetchMock);

    const request = fetchWithTimeout('https://example.test');
    const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(PUBLIC_FETCH_TIMEOUT_MS);

    await rejection;
  });

  it('não interrompe a leitura de uma resposta rápida', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal?.aborted).toBe(false);
      return Promise.resolve(new Response('resposta completa'));
    });
    const fetchWithTimeout = createTimeoutFetch(fetchMock);

    const response = await fetchWithTimeout('https://example.test');

    await expect(response.text()).resolves.toBe('resposta completa');
  });

  it('respeita o signal externo', async () => {
    const controller = new AbortController();
    const externalReason = new DOMException('Cancelada pela chamada.', 'AbortError');
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));
    const fetchWithTimeout = createTimeoutFetch(fetchMock);

    const request = fetchWithTimeout('https://example.test', { signal: controller.signal });
    controller.abort(externalReason);

    await expect(request).rejects.toBe(externalReason);
  });

  it('aborta quando o corpo demora além do tempo limite', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true });
        },
      });
      return Promise.resolve(new Response(body));
    });
    const fetchWithTimeout = createTimeoutFetch(fetchMock);

    const response = await fetchWithTimeout('https://example.test');
    const rejection = expect(response.text()).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(PUBLIC_FETCH_TIMEOUT_MS);

    await rejection;
  });
});
