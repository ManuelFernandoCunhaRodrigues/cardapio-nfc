import { describe, expect, it } from 'vitest';

import { loadEnv } from './env';

describe('loadEnv', () => {
  it('explica quais variáveis obrigatórias estão ausentes', () => {
    expect(() => loadEnv({})).toThrowError(
      /Invalid API environment: SUPABASE_URL:.*SUPABASE_ANON_KEY:.*WEB_ORIGIN:/,
    );
  });

  it('converte a porta válida para número', () => {
    const env = loadEnv({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      WEB_ORIGIN: 'https://salgae.example',
      PORT: '4100',
    });

    expect(env.PORT).toBe(4100);
  });

  it('rejeita WEB_ORIGIN com caminho', () => {
    expect(() =>
      loadEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        WEB_ORIGIN: 'https://salgae.example/admin',
      }),
    ).toThrowError(/WEB_ORIGIN: must contain only the origin/);
  });
});
