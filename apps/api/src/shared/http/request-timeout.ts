import { HTTPException } from 'hono/http-exception';
import { timeout } from 'hono/timeout';

const REQUEST_TIMEOUT_MS = 15_000;

export function requestTimeoutMiddleware() {
  return timeout(REQUEST_TIMEOUT_MS, new HTTPException(504, { message: 'Request timeout' }));
}
