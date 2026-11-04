import { cors } from 'hono/cors';

export function corsMiddleware(webOrigin: string) {
  return cors({
    origin: webOrigin,
    allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposeHeaders: ['X-Request-Id'],
    allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  });
}
