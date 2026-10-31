import { describe, expect, it } from 'vitest';

import { mediaObjectPaths } from './media-object-paths';

describe('mediaObjectPaths', () => {
  it('lista as duas variantes de uma foto enviada pelo painel', () => {
    expect(mediaObjectPaths('highlights/abc')).toEqual([
      'highlights/abc-detail.webp',
      'highlights/abc-card.webp',
    ]);
  });

  it('mantém um arquivo único quando o caminho já tem extensão', () => {
    expect(mediaObjectPaths('products/video.mp4')).toEqual(['products/video.mp4']);
  });
});
