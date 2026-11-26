import {
  apiErrorResponseSchema,
  createdResponseSchema,
  imageResponseSchema,
  videoResponseSchema,
  videoUploadResponseSchema,
} from '@salgae/core/contracts/admin-api';
import type { z } from 'zod';

import { getAccessToken } from '@/lib/auth/access-token';

import { ApiRequestError, SESSION_EXPIRED_MESSAGE } from './api-request-error';
import { embeddedApiFetch } from './embedded-api';

type WriteMethod = 'POST' | 'PUT' | 'DELETE';

type AdminApiClientOptions = {
  getToken: () => Promise<string | null>;
  fetchImplementation: typeof globalThis.fetch;
};

const UNEXPECTED_RESPONSE_MESSAGE = 'A API respondeu de um jeito inesperado.';

async function toRequestError(response: Response): Promise<ApiRequestError> {
  const body = apiErrorResponseSchema.safeParse(await response.json().catch(() => null));
  // Texto vazio não identifica pedido nenhum: fica de fora do erro e do log.
  const requestId =
    (body.success ? body.data.requestId : undefined) ||
    response.headers.get('x-request-id') ||
    undefined;
  return body.success
    ? new ApiRequestError(response.status, body.data.message, body.data.fieldErrors, requestId)
    : new ApiRequestError(response.status, UNEXPECTED_RESPONSE_MESSAGE, undefined, requestId);
}

/** Cliente do painel: toda chamada leva o token do admin e nunca é guardada em cache. */
export function createAdminApiClient({ getToken, fetchImplementation }: AdminApiClientOptions) {
  async function send(method: 'GET' | WriteMethod, path: string, body?: unknown) {
    const token = await getToken();
    if (!token) throw new ApiRequestError(401, SESSION_EXPIRED_MESSAGE);
    const response = await fetchImplementation(path, {
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
    async prepareVideo(path: string, body: { mimeType: string; size: number }) {
      return videoUploadResponseSchema.parse(await (await send('POST', path, body)).json());
    },
    async processVideo(path: string, rawPath: string) {
      return videoResponseSchema.parse(await (await send('POST', path, { path: rawPath })).json());
    },
  };
}

export function adminApi() {
  return createAdminApiClient({ getToken: getAccessToken, fetchImplementation: embeddedApiFetch });
}
