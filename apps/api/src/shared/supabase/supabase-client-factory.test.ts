import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseClientFactory } from './supabase-client-factory';

vi.mock('@supabase/supabase-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@supabase/supabase-js')>()),
  createClient: vi.fn(),
}));

const config = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockImplementation(() => ({}) as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createSupabaseClientFactory', () => {
  it('cria um cliente de usuário novo por requisição', () => {
    const factory = createSupabaseClientFactory(config);

    expect(factory.createUserClient('token')).not.toBe(factory.createUserClient('token'));
  });

  it('cria o cliente público com a chave anônima', () => {
    const factory = createSupabaseClientFactory(config);

    expect(factory.createPublicClient()).toBeDefined();
  });

  it.each([
    [
      'público',
      (factory: ReturnType<typeof createSupabaseClientFactory>) => factory.createPublicClient(),
    ],
    [
      'de usuário',
      (factory: ReturnType<typeof createSupabaseClientFactory>) =>
        factory.createUserClient('token'),
    ],
  ])('força no-store no cliente %s', async (_name, createClientFromFactory) => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchImplementation);
    const factory = createSupabaseClientFactory(config);
    createClientFromFactory(factory);
    const options = vi.mocked(createClient).mock.calls.at(-1)?.[2];

    await options?.global?.fetch?.('https://example.supabase.co/rest/v1/store', {
      cache: 'force-cache',
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/store',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});
