import { describe, expect, it } from 'vitest';

import { slugInputSchema, slugSchema } from './slug';

describe('slug', () => {
  it('aceita o slug longo que o banco gera para um nome de 120 caracteres', () => {
    const generated = `${'pastel-de-queijo-'.repeat(7)}2`;

    expect(generated.length).toBeGreaterThan(80);
    expect(slugSchema.safeParse(generated).success).toBe(true);
  });

  it('recusa letra maiúscula, espaço e hífen nas pontas', () => {
    for (const invalid of ['Pastel', 'pastel de queijo', '-pastel', 'pastel-']) {
      expect(slugSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('no slug digitado da categoria, limita a 80 caracteres', () => {
    expect(slugInputSchema.safeParse('a'.repeat(80)).success).toBe(true);
    expect(slugInputSchema.safeParse('a'.repeat(81)).success).toBe(false);
  });
});
