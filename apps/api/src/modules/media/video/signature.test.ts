import { describe, expect, it } from 'vitest';

import { VideoCompressionError } from './errors';
import { detectVideoContainer } from './signature';

function mp4Ftyp(brand = 'isom') {
  const bytes = Buffer.alloc(16);
  bytes.writeUInt32BE(16, 0);
  bytes.write('ftyp', 4, 'ascii');
  bytes.write(brand, 8, 'ascii');
  return bytes;
}

describe('assinatura real de vídeo', () => {
  it('aceita qualquer marca ISO com caixa ftyp na posição correta', () => {
    expect(detectVideoContainer(mp4Ftyp('qt  '))).toEqual({ kind: 'mp4', demuxer: 'mov' });
    expect(detectVideoContainer(mp4Ftyp('M4V '))).toEqual({ kind: 'mp4', demuxer: 'mov' });
  });

  it('aceita EBML somente quando DocType é webm', () => {
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, ...Buffer.from('webm')]);
    expect(detectVideoContainer(webm)).toEqual({ kind: 'webm', demuxer: 'matroska' });
    const matroska = Buffer.from([
      0x1a,
      0x45,
      0xdf,
      0xa3,
      0x42,
      0x82,
      0x88,
      ...Buffer.from('matroska'),
    ]);
    expect(() => detectVideoContainer(matroska)).toThrowError(VideoCompressionError);
  });

  it('recusa texto, ftyp truncado e ftyp fora da posição', () => {
    [
      Buffer.from('não é vídeo'),
      Buffer.from('ftyp'),
      Buffer.concat([Buffer.from('xxxx'), mp4Ftyp()]),
    ].forEach((bytes) => expect(() => detectVideoContainer(bytes)).toThrow('video_invalid'));
  });
});
