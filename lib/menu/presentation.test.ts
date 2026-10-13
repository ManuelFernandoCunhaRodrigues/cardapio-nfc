import { describe, expect, it } from 'vitest';

import { formatItemCount, formatStoreStatusTime, getProductCardWidth, getSaoPauloWeekday, splitLastWord } from './presentation';

describe('apresentação do cardápio', () => {
  it('separa somente a última palavra do título', () => {
    expect(splitLastWord('Coxinha cremosa')).toEqual({ leading: 'Coxinha', last: 'cremosa' });
    expect(splitLastWord('Quentinho')).toEqual({ leading: '', last: 'Quentinho' });
    expect(splitLastWord('  Combo   da casa  ')).toEqual({ leading: 'Combo da', last: 'casa' });
  });

  it('flexiona a contagem de itens', () => {
    expect(formatItemCount(0)).toBe('0 itens');
    expect(formatItemCount(1)).toBe('1 item');
    expect(formatItemCount(3)).toBe('3 itens');
  });

  it('calcula 140 px para o card em uma tela de 390 px', () => {
    expect(getProductCardWidth(390)).toBe(140);
    expect(getProductCardWidth(360)).toBe(128);
  });

  it('formata próxima abertura com dia e hora no fuso de São Paulo', () => {
    const mondayAtEight = new Date('2026-10-05T11:00:00.000Z');
    expect(formatStoreStatusTime(mondayAtEight, true)).toBe('segunda às 08:00');
    expect(getSaoPauloWeekday(new Date('2026-10-05T01:30:00.000Z'))).toBe(0);
  });
});
