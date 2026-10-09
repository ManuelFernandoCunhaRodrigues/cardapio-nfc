export const publicMediaBuckets = ['product-images', 'product-videos', 'highlight-images'] as const;
export type PublicMediaBucket = (typeof publicMediaBuckets)[number];

export function getPublicMediaUrl(bucket: PublicMediaBucket, path: string | null | undefined, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (!path?.trim() || !supabaseUrl?.trim()) return null;
  const encodedPath = path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${encodedPath}`;
}
