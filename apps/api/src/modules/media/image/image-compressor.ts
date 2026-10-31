import sharp, { type Metadata } from 'sharp';

export const IMAGE_BODY_MAX_BYTES = 4 * 1024 * 1024;
export const IMAGE_MIN_SIDE = 400;
export const WEBP_QUALITIES = [82, 76, 70] as const;

export type CompressedImage = { detail: Buffer; card: Buffer };

export class InvalidImageError extends Error {}
export class ImageTooSmallError extends Error {}

async function encodeVariant(input: Buffer, maxSide: number, targetBytes: number): Promise<Buffer> {
  let lastOutput: Buffer | undefined;
  for (const quality of WEBP_QUALITIES) {
    const output = await sharp(input)
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 5, smartSubsample: true })
      .toBuffer();
    if (output.length <= targetBytes) return output;
    lastOutput = output;
  }
  return lastOutput!;
}

async function readMetadata(input: Buffer): Promise<Metadata> {
  try {
    return await sharp(input, { failOn: 'error' }).metadata();
  } catch {
    throw new InvalidImageError();
  }
}

export async function compressImageToWebp(input: Buffer): Promise<CompressedImage> {
  const metadata = await readMetadata(input);
  const supported = new Set(['jpeg', 'png', 'webp', 'heif']);
  if (!metadata.format || !supported.has(metadata.format) || !metadata.width || !metadata.height) {
    throw new InvalidImageError();
  }
  if (Math.min(metadata.width, metadata.height) < IMAGE_MIN_SIDE) throw new ImageTooSmallError();
  const [detail, card] = await Promise.all([
    encodeVariant(input, 1600, 300 * 1024),
    encodeVariant(input, 640, 80 * 1024),
  ]);
  return { detail, card };
}
