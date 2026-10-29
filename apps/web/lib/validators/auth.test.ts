import { describe, expect, it } from 'vitest';

import { loginSchema } from '@/lib/validators/auth';

describe('loginSchema', () => {
  it('aceita credenciais preenchidas', () => {
    expect(loginSchema.safeParse({ email: 'admin@salgae.com', password: 'segredo' }).success).toBe(
      true,
    );
  });

  it('rejeita e-mail inválido e senha vazia', () => {
    expect(loginSchema.safeParse({ email: 'invalido', password: '' }).success).toBe(false);
  });
});
