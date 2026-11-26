import { describe, expect, it } from 'vitest';

import { CLIENT_IMAGE_MAX_BYTES, fitImageWithin, resizeImageForUpload } from './client-resize';

describe('redimensionamento de imagem no navegador', () => {
  it('reduz proporcionalmente a maior dimensão', () => {
    expect(fitImageWithin({ width: 4_000, height: 2_000 }, 2_000)).toEqual({
      width: 2_000,
      height: 1_000,
    });
  });

  it('não amplia uma imagem menor que o limite', () => {
    expect(fitImageWithin({ width: 300, height: 200 }, 2_000)).toEqual({
      width: 300,
      height: 200,
    });
  });

  it('rejeita o arquivo antes de decodificá-lo quando excede o limite', async () => {
    const oversized = new File([new Uint8Array(1)], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversized, 'size', { value: CLIENT_IMAGE_MAX_BYTES + 1 });

    await expect(resizeImageForUpload(oversized)).rejects.toThrow('image_too_large');
  });
});
