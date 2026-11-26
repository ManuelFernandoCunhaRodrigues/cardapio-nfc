import { crc32 } from 'node:zlib';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  assertProcessableImage,
  compressImageToWebp,
  createImageCompressor,
  IMAGE_BUCKET_MAX_BYTES,
  ImageResolutionTooHighError,
  ImageTooLargeError,
  ImageTooSmallError,
  InvalidImageError,
  UnsupportedImageFormatError,
} from './image-compressor';

async function jpeg(width: number, height: number, orientation?: number) {
  let image = sharp({
    create: { width, height, channels: 3, background: { r: 115, g: 70, b: 35 } },
  });
  if (orientation) image = image.withMetadata({ orientation });
  return image.jpeg({ quality: 95 }).toBuffer();
}

/** Ruído gaussiano quase não comprime: é o pior caso de foto com muita textura. */
function noisyPng(side: number) {
  return sharp({
    create: {
      width: side,
      height: side,
      channels: 3,
      background: '#888',
      noise: { type: 'gaussian', mean: 128, sigma: 80 },
    },
  })
    .png({ compressionLevel: 1 })
    .toBuffer();
}

/** PNG de poucos bytes cujo cabeçalho declara dimensões enormes (o ataque do limite de pixels). */
async function pngDeclaring(width: number, height: number) {
  const png = Buffer.from(
    await sharp({ create: { width: 1, height: 1, channels: 3, background: 'white' } })
      .png()
      .toBuffer(),
  );
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);
  return png;
}

describe('compressão de imagem', () => {
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

  it('reduz a foto muito texturizada até caber no limite do bucket', async () => {
    const compressed = await compressImageToWebp(await noisyPng(1600));

    const detail = await sharp(compressed.detail).metadata();
    expect(compressed.detail.length).toBeLessThanOrEqual(IMAGE_BUCKET_MAX_BYTES);
    expect(compressed.card.length).toBeLessThanOrEqual(IMAGE_BUCKET_MAX_BYTES);
    expect(detail.width).toBeLessThan(1600);
  }, 30_000);

  it('desiste com erro próprio quando nem a menor versão cabe no limite', async () => {
    const compress = createImageCompressor({ maxOutputBytes: 1_000 });

    await expect(compress(await noisyPng(600))).rejects.toBeInstanceOf(ImageTooLargeError);
  }, 30_000);

  it('recusa pelo cabeçalho a imagem com pixels demais, sem decodificar', async () => {
    await expect(compressImageToWebp(await pngDeclaring(8000, 6000))).rejects.toBeInstanceOf(
      ImageResolutionTooHighError,
    );
  });

  it('aceita AVIF, que o sharp decodifica', async () => {
    const avif = await sharp({
      create: { width: 800, height: 600, channels: 3, background: 'orange' },
    })
      .avif()
      .toBuffer();

    const compressed = await compressImageToWebp(avif);

    expect((await sharp(compressed.detail).metadata()).format).toBe('webp');
  });

  it('identifica o HEIC do iPhone (HEVC) como formato não suportado', () => {
    expect(() =>
      assertProcessableImage({ format: 'heif', compression: 'hevc', width: 4032, height: 3024 }),
    ).toThrow(UnsupportedImageFormatError);
  });
});
