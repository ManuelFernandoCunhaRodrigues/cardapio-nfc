import {
  apiErrorResponseSchema,
  createdResponseSchema,
  imageResponseSchema,
} from '@salgae/core/contracts/admin-api';
import type { z } from 'zod';

import { getAccessToken } from '@/lib/auth/access-token';
import { getApiEnv } from '@/lib/env';

import { ApiRequestError, SESSION_EXPIRED_MESSAGE } from './api-request-error';
import { createTimeoutFetch } from './timeout-fetch';

type WriteMethod = 'POST' | 'PUT' | 'DELETE';

type AdminApiClientOptions = {
  apiUrl: string;
  getToken: () => Promise<string | null>;
  fetchImplementation?: typeof globalThis.fetch;
};

const UNEXPECTED_RESPONSE_MESSAGE = 'A API respondeu de um jeito inesperado.';

async function toRequestError(response: Response): Promise<ApiRequestError> {
  const body = apiErrorResponseSchema.safeParse(await response.json().catch(() => null));
  return body.success
    ? new ApiRequestError(response.status, body.data.message, body.data.fieldErrors)
    : new ApiRequestError(response.status, UNEXPECTED_RESPONSE_MESSAGE);
}

/** Cliente do painel: toda chamada leva o token do admin e nunca é guardada em cache. */
export function createAdminApiClient({
  apiUrl,
  getToken,
  fetchImplementation = globalThis.fetch,
}: AdminApiClientOptions) {
  const timedFetch = createTimeoutFetch(fetchImplementation);

  async function send(method: 'GET' | WriteMethod, path: string, body?: unknown) {
    const token = await getToken();
    if (!token) throw new ApiRequestError(401, SESSION_EXPIRED_MESSAGE);
    const response = await timedFetch(`${apiUrl}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined || body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined
        ? {}
        : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    });
    if (!response.ok) throw await toRequestError(response);
    return response;
  }

  return {
    async read<T>(path: string, schema: z.ZodType<T>): Promise<T> {
      return schema.parse(await (await send('GET', path)).json());
    },
    async create(path: string, body: unknown): Promise<string> {
      return createdResponseSchema.parse(await (await send('POST', path, body)).json()).id;
    },
    async write(method: WriteMethod, path: string, body?: unknown): Promise<void> {
      await send(method, path, body);
    },
    async upload(path: string, body: FormData): Promise<string> {
      return imageResponseSchema.parse(await (await send('POST', path, body)).json()).path;
    },
  };
}

export function adminApi() {
  return createAdminApiClient({ apiUrl: getApiEnv().API_URL, getToken: getAccessToken });
}
