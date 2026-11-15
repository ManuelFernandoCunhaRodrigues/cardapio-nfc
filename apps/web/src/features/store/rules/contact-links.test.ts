import { describe, expect, it } from 'vitest';

import { buildInstagramHref, buildPhoneHref, buildWhatsAppHref } from './contact-links';

describe('links de contato da loja', () => {
  it('liga para o número com DDI e o sinal de mais', () => {
    expect(buildPhoneHref('5585999990000')).toBe('tel:+5585999990000');
  });

  it('completa o DDI 55 quando o número foi cadastrado só com DDD', () => {
    expect(buildPhoneHref('85999990000')).toBe('tel:+5585999990000');
    expect(buildPhoneHref('8533334444')).toBe('tel:+558533334444');
    expect(buildWhatsAppHref('85999990000')).toBe('https://wa.me/5585999990000');
  });

  it('disca como foi cadastrado quando o formato não é brasileiro', () => {
    expect(buildPhoneHref('33334444')).toBe('tel:33334444');
    expect(buildPhoneHref('351912345678')).toBe('tel:351912345678');
  });

  it('abre o WhatsApp com o DDI sem o sinal de mais, como o wa.me espera', () => {
    expect(buildWhatsAppHref('5585999990000')).toBe('https://wa.me/5585999990000');
  });

  it('abre o perfil do Instagram pelo usuário', () => {
    expect(buildInstagramHref('salgae')).toBe('https://instagram.com/salgae');
  });
});
