import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestCancelledError } from '../errors/request-cancelled-error';
import type { AppHonoEnv } from '../types';
import { errorHandler } from './error-handler';
import { requestSignal, requestTimeoutMiddleware } from './request-timeout';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function slowApp(writes: string[]) {
  const app = new Hono<AppHonoEnv>();
  app.use('*', requestTimeoutMiddleware());
  app.onError(errorHandler);
  app.post('/slow', async (context) => {
    await new Promise((resolve) => setTimeout(resolve, 20_000));
    requestSignal(context).throwIfAborted();
    writes.push('gravou');
    return context.text('ok');
  });
  return app;
}

describe('requestTimeoutMiddleware', () => {
  it('responde 504 quando o handler excede 15 segundos', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const responsePromise = slowApp([]).request('/slow', { method: 'POST' });
    await vi.advanceTimersByTimeAsync(15_000);
    const response = await responsePromise;

    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({
      message: 'A solicitação demorou mais que o esperado.',
    });
  });

  it('cancela o sinal da requisição para o handler não gravar depois do 504', async () => {
    vi.useFakeTimers();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const writes: string[] = [];

    const responsePromise = slowApp(writes).request('/slow', { method: 'POST' });
    await vi.advanceTimersByTimeAsync(15_000);
    await responsePromise;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(writes).toEqual([]);
    // Um registro só: o do timeout; o handler que parou depois não vira um segundo erro.
    expect(errors).toHaveBeenCalledTimes(1);
  });

  it('não cancela a requisição que termina no prazo', async () => {
    let signal: AbortSignal | undefined;
    const app = new Hono<AppHonoEnv>();
    app.use('*', requestTimeoutMiddleware());
    app.get('/fast', (context) => {
      signal = requestSignal(context);
      return context.text('ok');
    });

    const response = await app.request('/fast');

    expect(response.status).toBe(200);
    expect(signal?.aborted).toBe(false);
  });

  it('entrega ao handler um motivo de cancelamento com nome próprio', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let reason: unknown;
    const app = new Hono<AppHonoEnv>();
    app.use('*', requestTimeoutMiddleware());
    app.onError(errorHandler);
    app.get('/slow', async (context) => {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      reason = requestSignal(context).reason;
      return context.text('ok');
    });

    const responsePromise = app.request('/slow');
    await vi.advanceTimersByTimeAsync(20_000);
    await responsePromise;

    expect(reason).toBeInstanceOf(RequestCancelledError);
  });
});
