import type { MiddlewareHandler } from 'hono';

import type { AppHonoEnv } from '../types';

const PUBLIC_GET_PATH = /^\/(?:health|v1\/menu(?:\/|$)|v1\/store\/?$)/;
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate';

/** Permite que a CDN absorva as leituras públicas bem-sucedidas antes de chegarem ao banco. */
export const publicCacheMiddleware: MiddlewareHandler<AppHonoEnv> = async (context, next) => {
  await next();
  if (
    context.req.method === 'GET' &&
    context.res.status === 200 &&
    PUBLIC_GET_PATH.test(context.req.path)
  ) {
    context.header('Cache-Control', CACHE_CONTROL);
  }
};
