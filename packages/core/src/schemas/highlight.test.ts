import { describe, expect, it } from 'vitest';

import { highlightFormSchema } from './highlight';

function parseTarget(target: string) {
  return highlightFormSchema.safeParse({
    title: 'Combo',
    description: '',
    target,
    is_active: true,
  });
}

describe('highlightFormSchema', () => {
  it.each(['/cardapio', 'https://example.com/oferta'])('aceita o destino seguro %s', (target) => {
    expect(parseTarget(target).success).toBe(true);
  });

  it.each(['javascript:alert(1)', '//evil.example'])('rejeita o destino inseguro %s', (target) => {
    expect(parseTarget(target).success).toBe(false);
  });
});
