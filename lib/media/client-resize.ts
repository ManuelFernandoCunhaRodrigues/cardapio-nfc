'use client';

export const CLIENT_IMAGE_MAX_SIDE = 2048;
export const CLIENT_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

export type ImageDimensions = { width: number; height: number };

/** Calcula o tamanho proporcional sem ampliar imagens pequenas. */
export function fitImageWithin({ width, height }: ImageDimensions, maxSide = CLIENT_IMAGE_MAX_SIDE): ImageDimensions {
  const largestSide = Math.max(width, height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || largestSide <= maxSide) return { width, height };
  const scale = maxSide / largestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('canvas_export_failed')), 'image/jpeg', 0.92));
}

/**
 * Normaliza a orientação EXIF e reduz a imagem antes do envio. JPEG é usado
 * intencionalmente: Safari não oferece WebP consistente pelo canvas.
 */
export async function resizeImageForUpload(file: File): Promise<File> {
  if (file.size > CLIENT_IMAGE_MAX_BYTES) throw new Error('image_too_large');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const dimensions = fitImageWithin({ width: bitmap.width, height: bitmap.height });
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas_unavailable');
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
    const blob = await canvasBlob(canvas);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'imagem'}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
