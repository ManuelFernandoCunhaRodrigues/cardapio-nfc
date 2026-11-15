import type { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { timeout } from 'hono/timeout';

import { RequestCancelledError } from '../errors/request-cancelled-error';
import type { AppHonoEnv } from '../types';

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const NEVER_CANCELLED = new AbortController().signal;
type TimeoutDuration = number | ((context: Context<AppHonoEnv>) => number);

/**
 * Responde 504 depois do tempo limite e cancela o AbortSignal da requisição. O `timeout` do Hono
 * só corre contra o handler, sem pará-lo; o sinal é o que impede o handler de gravar depois.
 * O sinal do próprio Request (cliente desconectou) fica de fora de propósito: um upload que já
 * subiu os arquivos deve terminar o vínculo mesmo se a aba fechar.
 */
export function requestTimeoutMiddleware(
  duration: TimeoutDuration = DEFAULT_REQUEST_TIMEOUT_MS,
): MiddlewareHandler<AppHonoEnv> {
  return async (context, next) => {
    const timeoutMs = typeof duration === 'function' ? duration(context) : duration;
    const controller = new AbortController();
    context.set('requestSignal', controller.signal);
    const cancelOnTimeout = timeout(timeoutMs, () => {
      controller.abort(new RequestCancelledError());
      return new HTTPException(504, { message: 'Request timeout' });
    });
    await cancelOnTimeout(context, next);
  };
}

/** Sinal da requisição atual; sem o middleware de timeout (testes, por exemplo), nunca cancela. */
export function requestSignal(context: Context<AppHonoEnv>): AbortSignal {
  return context.get('requestSignal') ?? NEVER_CANCELLED;
}
