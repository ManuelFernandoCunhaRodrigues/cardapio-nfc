import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSiteEnv, getSiteUrl } from '@/lib/env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSiteEnv', () => {
  it('aceita os ambientes públicos conhecidos', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ENV', 'production');
    expect(getSiteEnv()).toBe('production');

    vi.stubEnv('NEXT_PUBLIC_SITE_ENV', 'staging');
    expect(getSiteEnv()).toBe('staging');
  });

  it('usa staging quando a variável está ausente ou é inválida', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ENV', undefined);
    expect(getSiteEnv()).toBe('staging');

    ['preview', 'Production', ' production '].forEach((value) => {
      vi.stubEnv('NEXT_PUBLIC_SITE_ENV', value);
      expect(getSiteEnv()).toBe('staging');
    });
  });

  it('não exige as variáveis do Supabase para ler o ambiente público', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_SITE_ENV', 'production');

    expect(getSiteEnv).not.toThrow();
    expect(getSiteEnv()).toBe('production');
  });
});

describe('getSiteUrl', () => {
  it('retorna URL para um endereço público válido', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://cardapio.exemplo.com/cardapio?origem=meta');

    const siteUrl = getSiteUrl();
    expect(siteUrl).toBeInstanceOf(URL);
    expect(siteUrl?.href).toBe('https://cardapio.exemplo.com/cardapio?origem=meta');
  });

  it('retorna undefined quando a variável está ausente ou é inválida', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);
    expect(getSiteUrl()).toBeUndefined();

    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'cardapio.exemplo.com');
    expect(getSiteUrl()).toBeUndefined();
  });
});
