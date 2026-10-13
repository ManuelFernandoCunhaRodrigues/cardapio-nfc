import { describe, expect, it } from 'vitest';

import { hasFastStart, parseTopLevelMp4Boxes } from './mp4';

function box(type: string, payloadBytes = 0) {
  const result = Buffer.alloc(8 + payloadBytes);
  result.writeUInt32BE(result.length, 0);
  result.write(type, 4, 'ascii');
  return result;
}

describe('parser de caixas MP4', () => {
  it('aceita moov inteiro antes de mdat com caixas intermediárias', () => {
    const bytes = Buffer.concat([box('ftyp', 8), box('free', 3), box('moov', 12), box('skip'), box('mdat', 20)]);
    expect(parseTopLevelMp4Boxes(bytes).map(({ type }) => type)).toEqual(['ftyp', 'free', 'moov', 'skip', 'mdat']);
    expect(hasFastStart(bytes)).toBe(true);
  });

  it('recusa moov posterior, ausente ou truncado', () => {
    expect(hasFastStart(Buffer.concat([box('ftyp'), box('mdat'), box('moov')]))).toBe(false);
    expect(hasFastStart(Buffer.concat([box('ftyp'), box('mdat')]))).toBe(false);
    const invalid = box('moov'); invalid.writeUInt32BE(100, 0);
    expect(() => parseTopLevelMp4Boxes(invalid)).toThrow('video_invalid');
  });
});

