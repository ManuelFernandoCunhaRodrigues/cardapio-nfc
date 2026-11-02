import { describe, expect, it, vi } from 'vitest';

import {
  CLIENT_IMAGE_MAX_BYTES,
  CLIENT_IMAGE_UPLOAD_MAX_BYTES,
  fitImageWithin,
} from '@/features/media/client/client-resize';
import {
  VIDEO_MAX_BYTES,
  acceptedVideoTypes,
  isAcceptedVideoType,
  resolveVideoMimeType,
  validateVideoForUpload,
} from '@/features/media/client/client-video';
import { getImageVariantPath } from '@/features/media/rules/media-urls';
import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';
import { highlightFormSchema } from '@salgae/core/schemas/highlight';

describe('Épico 4 — regras que continuam no navegador', () => {
  it('limita dimensões e tamanho antes do envio à API', () => {
    expect(fitImageWithin({ width: 4000, height: 2000 })).toEqual({ width: 2048, height: 1024 });
    expect(fitImageWithin({ width: 300, height: 200 })).toEqual({ width: 300, height: 200 });
    expect(CLIENT_IMAGE_MAX_BYTES).toBe(15 * 1024 * 1024);
    expect(CLIENT_IMAGE_UPLOAD_MAX_BYTES).toBeLessThan(4 * 1024 * 1024);
  });

  it('preserva os caminhos de variantes e arquivos legados', () => {
    expect(getImageVariantPath('products/id/base', 'card')).toBe('products/id/base-card.webp');
    expect(mediaObjectPaths('products/id/base')).toEqual([
      'products/id/base-detail.webp',
      'products/id/base-card.webp',
    ]);
    expect(mediaObjectPaths('products/id/legacy.jpg')).toEqual(['products/id/legacy.jpg']);
  });

  it('valida formato, tamanho e duração de vídeo no cliente', async () => {
    expect(acceptedVideoTypes).toEqual(['video/mp4', 'video/quicktime', 'video/webm']);
    expect(VIDEO_MAX_BYTES).toBe(52_428_800);
    expect(isAcceptedVideoType('video/mp4')).toBe(true);
    expect(resolveVideoMimeType({ name: 'iphone.MOV', type: '' })).toBe('video/quicktime');
    const oversized = new File([new Uint8Array(1)], 'x.mp4', { type: 'video/mp4' });
    Object.defineProperty(oversized, 'size', { value: VIDEO_MAX_BYTES + 1 });
    await expect(validateVideoForUpload(oversized)).rejects.toThrow('50 MB');
    vi.unstubAllGlobals();
  });

  it('aceita somente destinos seguros de destaque', () => {
    const valid = (target: string) =>
      highlightFormSchema.safeParse({ title: 'Combo', description: '', target, is_active: true });
    expect(valid('/cardapio').success).toBe(true);
    expect(valid('https://example.com/offer').success).toBe(true);
    expect(valid('javascript:alert(1)').success).toBe(false);
    expect(valid('//evil.example').success).toBe(false);
  });
});
