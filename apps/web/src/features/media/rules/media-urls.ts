export type PublicMediaBucket = 'product-images' | 'product-videos' | 'highlight-images';

export type ImageVariant = 'card' | 'detail';

/** Caminhos legados continuam apontando para um único arquivo. */
export function getImageVariantPath(
  path: string | null | undefined,
  variant: ImageVariant,
): string | null {
  if (!path?.trim()) return null;
  return /\.[a-z0-9]{2,5}$/i.test(path) ? path : `${path}-${variant}.webp`;
}

export function getPublicMediaUrl(
  bucket: PublicMediaBucket,
  path: string | null | undefined,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!path?.trim() || !supabaseUrl?.trim()) return null;
  const encodedPath = path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function getPublicImageVariantUrl(
  bucket: 'product-images' | 'highlight-images',
  path: string | null | undefined,
  variant: ImageVariant,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  return getPublicMediaUrl(bucket, getImageVariantPath(path, variant), supabaseUrl);
}
