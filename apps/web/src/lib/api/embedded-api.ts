import { createEmbeddedApi } from '@salgae/api/embedded';

import { getSupabaseEnv } from '@/lib/env';

const INTERNAL_API_ORIGIN = 'http://embedded-api.internal';

let embeddedApi: ReturnType<typeof createEmbeddedApi> | undefined;

function getEmbeddedApi() {
  if (embeddedApi) return embeddedApi;
  const env = getSupabaseEnv();
  embeddedApi = createEmbeddedApi({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return embeddedApi;
}

function toInternalUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return new URL(input.url, INTERNAL_API_ORIGIN);
  return new URL(input.toString(), INTERNAL_API_ORIGIN);
}

function forwardRequest(url: URL, request: Request) {
  const init = {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: request.redirect,
    signal: request.signal,
    ...(request.body ? { duplex: 'half' } : {}),
  } as RequestInit;
  return new Request(url, init);
}

export const embeddedApiFetch: typeof globalThis.fetch = async (input, init) => {
  const internalUrl = toInternalUrl(input);
  const request =
    input instanceof Request
      ? forwardRequest(internalUrl, new Request(input, init))
      : new Request(internalUrl, init);
  return getEmbeddedApi().fetch(request);
};

export function handleApiRoute(request: Request) {
  const incomingUrl = new URL(request.url);
  if (incomingUrl.pathname !== '/api' && !incomingUrl.pathname.startsWith('/api/')) {
    throw new Error(`A rota embutida exige o prefixo /api: ${incomingUrl.pathname}`);
  }
  const apiPath = incomingUrl.pathname.slice('/api'.length) || '/';
  const internalUrl = new URL(`${apiPath}${incomingUrl.search}`, INTERNAL_API_ORIGIN);
  return getEmbeddedApi().fetch(forwardRequest(internalUrl, request));
}
