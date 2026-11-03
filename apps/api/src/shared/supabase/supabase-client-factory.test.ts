import { describe, expect, it } from 'vitest';

import type { ApiEnv } from '../../config/env';
import { createSupabaseClientFactory } from './supabase-client-factory';

const env: ApiEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  WEB_ORIGIN: 'https://salgae.example',
};

describe('createSupabaseClientFactory', () => {
  it('cria um cliente de usuário novo por requisição', () => {
    const factory = createSupabaseClientFactory(env);

    expect(factory.createUserClient('token')).not.toBe(factory.createUserClient('token'));
  });

  it('cria o cliente público com a chave anônima', () => {
    const factory = createSupabaseClientFactory(env);

    expect(factory.createPublicClient()).toBeDefined();
  });
});
