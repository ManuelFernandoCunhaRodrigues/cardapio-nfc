import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  compressImageToWebp,
  ImageTooSmallError,
  InvalidImageError,
  WEBP_QUALITIES,
} from './image-compressor';

async function jpeg(width: number, height: number, orientation?: number) {
  let image = sharp({
    create: { width, height, channels: 3, background: { r: 115, g: 70, b: 35 } },
  });
  if (orientation) image = image.withMetadata({ orientation });
  return image.jpeg({ quality: 95 }).toBuffer();
}

describe('compressão de imagem', () => {
  it('usa qualidades limitadas a 82, 76 e 70', () => {
    expect(WEBP_QUALITIES).toEqual([82, 76, 70]);
  });

  it('normaliza orientação e gera variantes sem ampliar', async () => {
    const rotated = await compressImageToWebp(await jpeg(3200, 1800, 6));
    const small = await compressImageToWebp(await jpeg(800, 600));

    const [detail, card, smallDetail, smallCard] = await Promise.all([
      sharp(rotated.detail).metadata(),
      sharp(rotated.card).metadata(),
      sharp(small.detail).metadata(),
      sharp(small.card).metadata(),
    ]);
    expect([detail.width, detail.height]).toEqual([900, 1600]);
    expect([card.width, card.height]).toEqual([360, 640]);
    expect([smallDetail.width, smallDetail.height]).toEqual([800, 600]);
    expect([smallCard.width, smallCard.height]).toEqual([640, 480]);
  });

  it('recusa bytes inválidos e imagem pequena', async () => {
    await expect(compressImageToWebp(Buffer.from('not jpeg'))).rejects.toBeInstanceOf(
      InvalidImageError,
    );
    await expect(compressImageToWebp(await jpeg(399, 800))).rejects.toBeInstanceOf(
      ImageTooSmallError,
    );
  });

  it('remove EXIF e ICC das variantes', async () => {
    const source = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: 'brown' },
    })
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: 'Test' } }, icc: 'srgb' })
      .jpeg()
      .toBuffer();

    const compressed = await compressImageToWebp(source);
    const [detail, card] = await Promise.all([
      sharp(compressed.detail).metadata(),
      sharp(compressed.card).metadata(),
    ]);
    expect(detail.exif).toBeUndefined();
    expect(card.exif).toBeUndefined();
    expect(detail.icc).toBeUndefined();
    expect(card.icc).toBeUndefined();
  });
});
