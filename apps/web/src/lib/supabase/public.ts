import { createClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from '@/lib/env';
import type { Database } from '@salgae/core/database/database.types';

export const PUBLIC_FETCH_TIMEOUT_MS = 10_000;

export function createTimeoutFetch(
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  timeoutMs = PUBLIC_FETCH_TIMEOUT_MS,
): typeof globalThis.fetch {
  return async (input, init) => {
    const timeoutController = new AbortController();
    const externalSignal = init?.signal;
    const abortFromExternalSignal = () => timeoutController.abort(externalSignal?.reason);

    if (externalSignal?.aborted) abortFromExternalSignal();
    else externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });

    const timeout = setTimeout(() => {
      timeoutController.abort(
        new DOMException('A leitura pública excedeu o tempo limite.', 'AbortError'),
      );
      externalSignal?.removeEventListener('abort', abortFromExternalSignal);
    }, timeoutMs);
    timeout.unref?.();

    try {
      return await fetchImplementation(input, { ...init, signal: timeoutController.signal });
    } catch (error) {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromExternalSignal);
      throw error;
    }
  };
}

/** Cliente anônimo sem cookies, próprio para páginas públicas cacheáveis. */
export function createPublicClient() {
  const env = getSupabaseEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createTimeoutFetch() },
  });
}
