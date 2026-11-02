import { requestId } from 'hono/request-id';

export function requestIdMiddleware() {
  return requestId({ headerName: 'x-request-id', limitLength: 128 });
}
