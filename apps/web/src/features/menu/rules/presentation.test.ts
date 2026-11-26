import { describe, expect, it } from 'vitest';

import {
  formatItemCount,
  formatNextOpening,
  formatStoreStatusTime,
  getProductCardWidth,
  getSaoPauloWeekday,
  splitLastWord,
} from './presentation';

// Segunda, 5 de outubro de 2026, 08:00 em São Paulo.
const mondayAtEight = new Date('2026-10-05T11:00:00.000Z');

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

  it('formata a hora no fuso de São Paulo', () => {
    expect(formatStoreStatusTime(mondayAtEight)).toBe('08:00');
    expect(getSaoPauloWeekday(new Date('2026-10-05T01:30:00.000Z'))).toBe(0);
  });

  describe('próxima abertura', () => {
    it('diz "hoje" quando a loja abre no mesmo dia', () => {
      expect(formatNextOpening(mondayAtEight, new Date('2026-10-05T09:00:00.000Z'))).toBe(
        'hoje às 08:00',
      );
    });

    it('diz "amanhã" quando abre no dia seguinte, pelo calendário de São Paulo', () => {
      expect(formatNextOpening(mondayAtEight, new Date('2026-10-04T23:00:00.000Z'))).toBe(
        'amanhã às 08:00',
      );
      // Domingo 23:30 em São Paulo já é segunda em UTC: continua sendo "amanhã".
      expect(formatNextOpening(mondayAtEight, new Date('2026-10-05T02:30:00.000Z'))).toBe(
        'amanhã às 08:00',
      );
    });

    it('usa o dia da semana, sem "-feira", a partir de depois de amanhã', () => {
      expect(formatNextOpening(mondayAtEight, new Date('2026-10-03T23:00:00.000Z'))).toBe(
        'segunda às 08:00',
      );
    });
  });
});
