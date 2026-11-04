import { describe, expect, it } from 'vitest';

import { storeSettingsFormSchema } from './store-settings';

const validSettings = {
  name: ' Salgaê Lanchonete ',
  tagline: ' ',
  address: '',
  maps_url: '',
  phone: '(85) 99999-9999',
  whatsapp: '+55 (85) 99999-9999',
  instagram: '@salgaelanchonete',
  status_override: 'auto',
  notice: '',
  opening_hours: Array.from({ length: 7 }, (_, day) => ({
    day,
    closed: day === 0,
    open: '08:00',
    close: '18:00',
  })),
};

describe('storeSettingsFormSchema', () => {
  it('aparar textos e normaliza os contatos', () => {
    const parsed = storeSettingsFormSchema.parse(validSettings);
    expect(parsed).toMatchObject({
      name: 'Salgaê Lanchonete',
      tagline: null,
      phone: '85999999999',
      whatsapp: '5585999999999',
      instagram: 'salgaelanchonete',
      notice: null,
    });
  });

  it('rejeita URL inválida, horário invertido e dias repetidos', () => {
    const result = storeSettingsFormSchema.safeParse({
      ...validSettings,
      maps_url: 'mapa sem protocolo',
      opening_hours: Array.from({ length: 7 }, (_, index) => ({
        day: index === 6 ? 5 : index,
        closed: false,
        open: '18:00',
        close: '08:00',
      })),
    });
    expect(result.success).toBe(false);
  });

  it('limita o aviso a 140 caracteres', () => {
    expect(
      storeSettingsFormSchema.safeParse({ ...validSettings, notice: 'a'.repeat(141) }).success,
    ).toBe(false);
  });
});
