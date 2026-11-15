import { describe, expect, it } from 'vitest';

import { buildInstagramHref, buildPhoneHref, buildWhatsAppHref } from './contact-links';

describe('links de contato da loja', () => {
  it('liga para o número com DDI e o sinal de mais', () => {
    expect(buildPhoneHref('5585999990000')).toBe('tel:+5585999990000');
  });

  it('abre o WhatsApp com o DDI sem o sinal de mais, como o wa.me espera', () => {
    expect(buildWhatsAppHref('5585999990000')).toBe('https://wa.me/5585999990000');
  });

  it('abre o perfil do Instagram pelo usuário', () => {
    expect(buildInstagramHref('salgae')).toBe('https://instagram.com/salgae');
  });
});
