import type { AppSupabaseClient } from '../../../shared/supabase/supabase-client-factory';
import type { ProductVideoRecord, VideoPathChange, VideoRepository } from './video.service';

type VideoPathFilter<Query> = {
  eq(column: 'video_path', value: string): Query;
  is(column: 'video_path', value: null): Query;
};

function whereVideoPathIs<Query extends VideoPathFilter<Query>>(
  query: Query,
  current: string | null,
): Query {
  return current === null ? query.is('video_path', null) : query.eq('video_path', current);
}

export class SupabaseVideoRepository implements VideoRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async findProduct(id: string): Promise<ProductVideoRecord | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('image_path, video_path')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? { imagePath: data.image_path, videoPath: data.video_path } : null;
  }

  async replaceVideoPath(id: string, { from, to }: VideoPathChange): Promise<boolean> {
    const query = this.supabase.from('products').update({ video_path: to }).eq('id', id);
    const { data, error } = await whereVideoPathIs(query, from).select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async createSignedUploadUrl(path: string) {
    const { data, error } = await this.supabase.storage
      .from('product-video-uploads')
      .createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error('signed_upload_missing');
    return { signedUrl: data.signedUrl, token: data.token };
  }

  async downloadRaw(path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage
      .from('product-video-uploads')
      .download(path);
    if (error || !data) throw error ?? new Error('raw_video_missing');
    return data;
  }

  async uploadVideo(path: string, bytes: Buffer): Promise<void> {
    const { error } = await this.supabase.storage.from('product-videos').upload(path, bytes, {
      contentType: 'video/mp4',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;
  }

  async isVideoInUse(path: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('products')
      .select('id')
      .eq('video_path', path)
      .limit(1);
    if (error || data === null) throw error ?? new Error('reference_check_failed');
    return data.length > 0;
  }

  async removeVideo(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from('product-videos').remove([path]);
    if (error) throw error;
  }

  async removeRaw(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from('product-video-uploads').remove([path]);
    if (error) throw error;
  }
}
