import sharp, { type Metadata, type SharpOptions } from 'sharp';

export const IMAGE_BODY_MAX_BYTES = 4 * 1024 * 1024;
/** `file_size_limit` dos buckets de foto (migration 20261009121148_media_storage.sql). */
export const IMAGE_BUCKET_MAX_BYTES = 1_048_576;
/** Bem acima dos 2048 px que o painel envia, mas barra a imagem pequena em bytes e enorme em pixels. */
export const IMAGE_MAX_INPUT_PIXELS = 40_000_000;
const IMAGE_MIN_SIDE = 400;
const WEBP_QUALITIES = [82, 76, 70] as const;
const LOWEST_QUALITY = WEBP_QUALITIES[WEBP_QUALITIES.length - 1];
/** Cada redução encolhe o maior lado para 80%; duas tentativas levam 1600 px a 1024 px. */
const SHRINK_FACTOR = 0.8;
const SHRINK_ATTEMPTS = 2;

// Ler o cabeçalho não decodifica pixels; sem o limite aqui, o excesso vira um erro com nome próprio.
const METADATA_OPTIONS: SharpOptions = { failOn: 'error', limitInputPixels: false };
const DECODE_OPTIONS: SharpOptions = { failOn: 'error', limitInputPixels: IMAGE_MAX_INPUT_PIXELS };
const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif']);

const variants = {
  detail: { maxSide: 1600, targetBytes: 300 * 1024 },
  card: { maxSide: 640, targetBytes: 80 * 1024 },
} as const;

type Variant = (typeof variants)[keyof typeof variants];
type RawImage = { data: Buffer; width: number; height: number; channels: 1 | 2 | 3 | 4 };
type InputMetadata = Pick<Metadata, 'format' | 'compression' | 'width' | 'height'>;

export type CompressedImage = { detail: Buffer; card: Buffer };
export type ImageCompressorOptions = { maxOutputBytes: number };

export class InvalidImageError extends Error {}
export class ImageTooSmallError extends Error {}
/** HEIC/HEIF com HEVC: o sharp pré-compilado lê o cabeçalho, mas não decodifica os pixels. */
export class UnsupportedImageFormatError extends Error {}
export class ImageResolutionTooHighError extends Error {}
/** Nem na menor dimensão e qualidade a variante coube no limite do bucket. */
export class ImageTooLargeError extends Error {}

async function readMetadata(input: Buffer): Promise<Metadata> {
  try {
    return await sharp(input, METADATA_OPTIONS).metadata();
  } catch {
    throw new InvalidImageError();
  }
}

/** Confere pelo cabeçalho se vale a pena decodificar: formato, tamanho mínimo e teto de pixels. */
export function assertProcessableImage({ format, compression, width, height }: InputMetadata) {
  if (!format || !SUPPORTED_FORMATS.has(format) || !width || !height) {
    throw new InvalidImageError();
  }
  // No contêiner HEIF, só o AVIF (AV1) é decodificável; o HEIC do iPhone (HEVC) não.
  if (format === 'heif' && compression !== 'av1') throw new UnsupportedImageFormatError();
  if (Math.min(width, height) < IMAGE_MIN_SIDE) throw new ImageTooSmallError();
  if (width * height > IMAGE_MAX_INPUT_PIXELS) throw new ImageResolutionTooHighError();
}

/** Decodifica a entrada uma única vez, já girada e reduzida ao tamanho da maior variante. */
async function decodeOnce(input: Buffer, maxSide: number): Promise<RawImage> {
  try {
    const { data, info } = await sharp(input, DECODE_OPTIONS)
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, channels: info.channels };
  } catch {
    throw new InvalidImageError();
  }
}

async function resizeRaw(image: RawImage, maxSide: number): Promise<RawImage> {
  const { data, width, height, channels } = image;
  const resized = await sharp(data, { raw: { width, height, channels } })
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: resized.data,
    width: resized.info.width,
    height: resized.info.height,
    channels: resized.info.channels,
  };
}

function encodeWebp({ data, width, height, channels }: RawImage, quality: number) {
  return sharp(data, { raw: { width, height, channels } })
    .webp({ quality, effort: 5, smartSubsample: true })
    .toBuffer();
}

/** Primeiro busca o alvo de bytes baixando a qualidade; o limite do bucket é a barreira final. */
async function encodeWithinTarget(image: RawImage, targetBytes: number): Promise<Buffer> {
  let smallest: Buffer | undefined;
  for (const quality of WEBP_QUALITIES) {
    const output = await encodeWebp(image, quality);
    if (output.length <= targetBytes) return output;
    if (!smallest || output.length < smallest.length) smallest = output;
  }
  if (!smallest) throw new ImageTooLargeError();
  return smallest;
}

async function encodeVariant(
  image: RawImage,
  { maxSide, targetBytes }: Variant,
  maxOutputBytes: number,
): Promise<Buffer> {
  let current = await resizeRaw(image, maxSide);
  let output = await encodeWithinTarget(current, targetBytes);
  let side = Math.max(current.width, current.height);
  for (let attempt = 0; attempt < SHRINK_ATTEMPTS && output.length > maxOutputBytes; attempt++) {
    side = Math.floor(side * SHRINK_FACTOR);
    current = await resizeRaw(current, side);
    output = await encodeWebp(current, LOWEST_QUALITY);
  }
  if (output.length > maxOutputBytes) throw new ImageTooLargeError();
  return output;
}

export function createImageCompressor({ maxOutputBytes }: ImageCompressorOptions) {
  return async function compressImageToWebp(input: Buffer): Promise<CompressedImage> {
    assertProcessableImage(await readMetadata(input));
    const decoded = await decodeOnce(input, variants.detail.maxSide);
    const [detail, card] = await Promise.all([
      encodeVariant(decoded, variants.detail, maxOutputBytes),
      encodeVariant(decoded, variants.card, maxOutputBytes),
    ]);
    return { detail, card };
  };
}

export const compressImageToWebp = createImageCompressor({
  maxOutputBytes: IMAGE_BUCKET_MAX_BYTES,
});
