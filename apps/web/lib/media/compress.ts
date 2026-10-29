import sharp, { type Metadata } from 'sharp';

export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const IMAGE_MIN_SIDE = 400;
export const WEBP_INITIAL_QUALITY = 82;
export const WEBP_MIN_QUALITY = 70;
export const WEBP_QUALITY_STEP = 6;

export type MediaVariant = 'detail' | 'card';
export type CompressedImage = { detail: Buffer; card: Buffer };

export function fitImageWithin(
  { width, height }: { width: number; height: number },
  maxSide: number,
) {
  const largestSide = Math.max(width, height);
  if (largestSide <= maxSide) return { width, height };
  const scale = maxSide / largestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Sequência fixa 82 → 76 → 70; jamais degrada além da qualidade mínima. */
export function webpQualityCandidates(): number[] {
  return [WEBP_INITIAL_QUALITY, WEBP_INITIAL_QUALITY - WEBP_QUALITY_STEP, WEBP_MIN_QUALITY];
}

/** Escolhe a primeira qualidade que atingiu a meta; se nenhuma atingir, preserva 70. */
export function chooseWebpQuality(encodedSizes: readonly number[], targetBytes: number): number {
  const qualities = webpQualityCandidates();
  const index = encodedSizes.findIndex((size) => size <= targetBytes);
  return qualities[index] ?? WEBP_MIN_QUALITY;
}

async function encodeVariant(input: Buffer, maxSide: number, targetBytes: number): Promise<Buffer> {
  const outputs: Buffer[] = [];
  for (const quality of webpQualityCandidates()) {
    const output = await sharp(input)
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 5, smartSubsample: true })
      .toBuffer();
    outputs.push(output);
    if (output.length <= targetBytes) return output;
  }
  return outputs.at(-1)!;
}

/** Valida bytes reais com sharp e produz as duas variantes sem metadados. */
export async function compressImageToWebp(input: Buffer): Promise<CompressedImage> {
  if (!input.length || input.length > IMAGE_MAX_BYTES) throw new Error('image_size_invalid');
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { failOn: 'error' }).metadata();
  } catch {
    throw new Error('image_invalid');
  }
  const supported = new Set(['jpeg', 'png', 'webp', 'heif']);
  if (!metadata.format || !supported.has(metadata.format) || !metadata.width || !metadata.height)
    throw new Error('image_invalid');
  if (Math.min(metadata.width, metadata.height) < IMAGE_MIN_SIDE)
    throw new Error('image_too_small');
  const [detail, card] = await Promise.all([
    encodeVariant(input, 1600, 300 * 1024),
    encodeVariant(input, 640, 80 * 1024),
  ]);
  return { detail, card };
}
