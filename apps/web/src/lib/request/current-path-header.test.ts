import { describe, expect, it } from 'vitest';

import { hasSupabaseSessionCookie } from './current-path-header';

describe('hasSupabaseSessionCookie', () => {
  it('reconhece o cookie de sessão do Supabase, inteiro ou em pedaços', () => {
    expect(hasSupabaseSessionCookie(['sb-abc123-auth-token'])).toBe(true);
    expect(hasSupabaseSessionCookie(['outro', 'sb-abc123-auth-token.0'])).toBe(true);
  });

  it('ignora outros cookies', () => {
    expect(hasSupabaseSessionCookie([])).toBe(false);
    expect(hasSupabaseSessionCookie(['sb-abc123-auth-token-code-verifier', 'tema'])).toBe(false);
  });
});
