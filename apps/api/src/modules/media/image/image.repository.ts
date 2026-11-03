import type { AppSupabaseClient } from '../../../shared/supabase/supabase-client-factory';
import type { ImageRepository, ImageTarget } from './image.service';
import type { CompressedImage } from './image-compressor';

const targetSettings = {
  product: { table: 'products', bucket: 'product-images' },
  highlight: { table: 'highlights', bucket: 'highlight-images' },
} as const;

export class SupabaseImageRepository implements ImageRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async findRecord(target: ImageTarget, id: string) {
    if (target === 'product') {
      const { data, error } = await this.supabase
        .from('products')
        .select('image_path, video_path')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? { imagePath: data.image_path, videoPath: data.video_path } : null;
    }
    const { data, error } = await this.supabase
      .from('highlights')
      .select('image_path')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? { imagePath: data.image_path } : null;
  }

  async setImagePath(target: ImageTarget, id: string, imagePath: string | null) {
    const { table } = targetSettings[target];
    const query =
      table === 'products'
        ? this.supabase.from('products').update({ image_path: imagePath }).eq('id', id).select('id')
        : this.supabase
            .from('highlights')
            .update({ image_path: imagePath })
            .eq('id', id)
            .select('id');
    const { data, error } = await query;
    if (error) throw error;
    return data.length > 0;
  }

  async uploadVariants(target: ImageTarget, basePath: string, image: CompressedImage) {
    const bucket = targetSettings[target].bucket;
    const options = { contentType: 'image/webp', upsert: false, cacheControl: '31536000' };
    const detailPath = `${basePath}-detail.webp`;
    const cardPath = `${basePath}-card.webp`;
    const detail = await this.supabase.storage
      .from(bucket)
      .upload(detailPath, image.detail, options);
    if (detail.error) throw detail.error;
    const card = await this.supabase.storage.from(bucket).upload(cardPath, image.card, options);
    if (!card.error) return;
    await this.supabase.storage.from(bucket).remove([detailPath]);
    throw card.error;
  }

  async removeFiles(target: ImageTarget, paths: string[]) {
    const { error } = await this.supabase.storage.from(targetSettings[target].bucket).remove(paths);
    if (error) throw error;
  }

  async isImageInUse(imagePath: string) {
    const [products, highlights, categories] = await Promise.all([
      this.supabase.from('products').select('id').eq('image_path', imagePath).limit(1),
      this.supabase.from('highlights').select('id').eq('image_path', imagePath).limit(1),
      this.supabase.from('categories').select('id').eq('image_path', imagePath).limit(1),
    ]);
    const results = [products, highlights, categories];
    for (const result of results) {
      if (result.error || result.data === null)
        throw result.error ?? new Error('reference_check_failed');
    }
    return results.some((result) => result.data!.length > 0);
  }
}
