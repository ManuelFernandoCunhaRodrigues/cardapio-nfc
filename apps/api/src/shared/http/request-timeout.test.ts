import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestTimeoutMiddleware } from './request-timeout';

afterEach(() => {
  vi.useRealTimers();
});

describe('requestTimeoutMiddleware', () => {
  it('responde 504 quando o handler excede 15 segundos', async () => {
    vi.useFakeTimers();
    const app = new Hono();
    app.use('*', requestTimeoutMiddleware());
    app.get('/slow', async (context) => {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      return context.text('ok');
    });

    const responsePromise = app.request('/slow');
    await vi.advanceTimersByTimeAsync(15_000);
    const response = await responsePromise;

    expect(response.status).toBe(504);
  });
});
