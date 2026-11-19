import { AsyncLocalStorage } from 'node:async_hooks';

import { requestId } from 'hono/request-id';

const requestIdStorage = new AsyncLocalStorage<string>();

export function requestIdMiddleware() {
  const assignRequestId = requestId({ headerName: 'x-request-id', limitLength: 128 });
  return async (
    context: Parameters<typeof assignRequestId>[0],
    next: Parameters<typeof assignRequestId>[1],
  ) => assignRequestId(context, () => requestIdStorage.run(context.get('requestId'), next));
}

export function currentRequestId(): string | undefined {
  return requestIdStorage.getStore();
}
