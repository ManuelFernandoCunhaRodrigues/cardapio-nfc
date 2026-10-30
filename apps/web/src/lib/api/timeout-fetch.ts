export const PUBLIC_API_TIMEOUT_MS = 10_000;

export function createTimeoutFetch(
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  timeoutMs = PUBLIC_API_TIMEOUT_MS,
): typeof globalThis.fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const externalSignal = init?.signal;
    const abortFromExternalSignal = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted) abortFromExternalSignal();
    else externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });

    const timeout = setTimeout(
      () => controller.abort(new DOMException('A API excedeu o tempo limite.', 'AbortError')),
      timeoutMs,
    );
    timeout.unref?.();

    try {
      return await fetchImplementation(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromExternalSignal);
    }
  };
}
