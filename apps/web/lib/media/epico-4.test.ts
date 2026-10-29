import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialMediaActionState } from '@/app/admin/(painel)/midia/action-state';
import {
  createProductVideoUpload,
  removeHighlightImage,
  removeProductImage,
  removeProductVideo,
  uploadHighlightImage,
  uploadProductImage,
} from '@/app/admin/(painel)/midia/actions';
import { createHighlight } from '@/app/admin/(painel)/destaques/actions';
import { swapSortOrders } from '@/lib/admin/reorder';
import {
  CLIENT_IMAGE_MAX_BYTES,
  fitImageWithin as fitClientImage,
} from '@/lib/media/client-resize';
import {
  VIDEO_MAX_BYTES,
  acceptedVideoTypes,
  isAcceptedVideoType,
  resolveVideoMimeType,
  validateVideoForUpload,
} from '@/lib/media/client-video';
import {
  chooseWebpQuality,
  compressImageToWebp,
  fitImageWithin as fitServerImage,
  IMAGE_MAX_BYTES,
  webpQualityCandidates,
} from '@/lib/media/compress';
import { getImageVariantPath } from '@/lib/media';
import { commitStagedMedia, isMediaUnreferenced, mediaObjectPaths } from '@/lib/media/workflow';
import { highlightFormSchema } from '@/lib/validators/highlight';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  reportServerError: vi.fn(),
}));

vi.mock('@/lib/admin/require-admin', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.reportServerError }));

const productId = '11111111-1111-4111-8111-111111111111';
const highlightId = '22222222-2222-4222-8222-222222222222';

async function jpeg(
  width: number,
  height: number,
  options?: {
    orientation?: number;
    exif?: Record<string, Record<string, string | number>>;
    icc?: string;
  },
) {
  let image = sharp({
    create: { width, height, channels: 3, background: { r: 115, g: 70, b: 35 } },
  });
  if (options?.orientation || options?.exif || options?.icc)
    image = image.withMetadata({
      orientation: options.orientation,
      exif: options.exif,
      icc: options.icc,
    });
  return image.jpeg({ quality: 95 }).toBuffer();
}

async function noisyJpeg(width: number, height: number) {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const grain = ((x * 17 + y * 31 + ((x * y) % 97)) % 39) - 19;
      raw[index] = Math.max(0, Math.min(255, 90 + Math.round((x / width) * 105) + grain));
      raw[index + 1] = Math.max(0, Math.min(255, 55 + Math.round((y / height) * 125) + grain));
      raw[index + 2] = Math.max(
        0,
        Math.min(255, 30 + Math.round(((x + y) / (width + height)) * 145) + grain),
      );
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 96 })
    .toBuffer();
}

async function psnr(reference: Buffer, output: Buffer) {
  const [a, b] = await Promise.all([
    sharp(reference).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  expect(a.info.width).toBe(b.info.width);
  expect(a.info.height).toBe(b.info.height);
  let squaredError = 0;
  for (let index = 0; index < a.data.length; index += 1) {
    const delta = a.data[index] - b.data[index];
    squaredError += delta * delta;
  }
  const mse = squaredError / a.data.length;
  return mse === 0 ? Number.POSITIVE_INFINITY : 10 * Math.log10((255 * 255) / mse);
}

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe('Épico 4 — algoritmo de mídia', () => {
  it('1. limita as dimensões do cliente sem ampliar imagens', () => {
    expect(fitClientImage({ width: 4000, height: 2000 })).toEqual({ width: 2048, height: 1024 });
    expect(fitClientImage({ width: 2000, height: 4000 })).toEqual({ width: 1024, height: 2048 });
    expect(fitClientImage({ width: 2048, height: 1200 })).toEqual({ width: 2048, height: 1200 });
    expect(fitClientImage({ width: 300, height: 200 })).toEqual({ width: 300, height: 200 });
  });

  it('2. usa 82 → 76 → 70 e nunca fica abaixo de 70', () => {
    expect(webpQualityCandidates()).toEqual([82, 76, 70]);
    expect(chooseWebpQuality([100, 90, 80], 100)).toBe(82);
    expect(chooseWebpQuality([101, 100, 90], 100)).toBe(76);
    expect(chooseWebpQuality([101, 101, 100], 100)).toBe(70);
    expect(chooseWebpQuality([101, 101, 101], 100)).toBe(70);
  });

  it('3. rotaciona orientation 6 e produz dimensões exatas, sem ampliar imagem pequena', async () => {
    const rotated = await compressImageToWebp(await jpeg(3200, 1800, { orientation: 6 }));
    const [detail, card] = await Promise.all([
      sharp(rotated.detail).metadata(),
      sharp(rotated.card).metadata(),
    ]);
    expect([detail.width, detail.height]).toEqual([900, 1600]);
    expect([card.width, card.height]).toEqual([360, 640]);

    const small = await compressImageToWebp(await jpeg(800, 600));
    const [smallDetail, smallCard] = await Promise.all([
      sharp(small.detail).metadata(),
      sharp(small.card).metadata(),
    ]);
    expect([smallDetail.width, smallDetail.height]).toEqual([800, 600]);
    expect([smallCard.width, smallCard.height]).toEqual([640, 480]);
  });

  it('4. usa o mesmo limite de 15 MiB no cliente/servidor e rejeita bytes inválidos', async () => {
    expect(CLIENT_IMAGE_MAX_BYTES).toBe(15 * 1024 * 1024);
    expect(IMAGE_MAX_BYTES).toBe(CLIENT_IMAGE_MAX_BYTES);
    await expect(compressImageToWebp(Buffer.from('não é jpeg'))).rejects.toThrow('image_invalid');
    await expect(compressImageToWebp((await jpeg(400, 400)).subarray(0, 30))).rejects.toThrow(
      'image_invalid',
    );
    await expect(compressImageToWebp(await jpeg(399, 800))).rejects.toThrow('image_too_small');
    await expect(compressImageToWebp(Buffer.alloc(IMAGE_MAX_BYTES + 1))).rejects.toThrow(
      'image_size_invalid',
    );
  });

  it('5. escolhe sufixos novos e preserva caminhos legados com extensão', () => {
    expect(getImageVariantPath('products/id/uuid', 'card')).toBe('products/id/uuid-card.webp');
    expect(getImageVariantPath('products/id/uuid', 'detail')).toBe('products/id/uuid-detail.webp');
    expect(getImageVariantPath('products/id/foto-antiga.jpg', 'card')).toBe(
      'products/id/foto-antiga.jpg',
    );
  });

  it('6. valida formato, tamanho e duração de vídeo no cliente', async () => {
    expect(acceptedVideoTypes).toEqual(['video/mp4', 'video/quicktime', 'video/webm']);
    expect(VIDEO_MAX_BYTES).toBe(52_428_800);
    expect(isAcceptedVideoType('video/mp4')).toBe(true);
    expect(isAcceptedVideoType('video/quicktime')).toBe(true);
    expect(resolveVideoMimeType({ name: 'iphone.MOV', type: '' })).toBe('video/quicktime');
    expect(resolveVideoMimeType({ name: 'clip.m4v', type: 'video/x-m4v' })).toBe('video/quicktime');
    const oversized = new File([new Uint8Array(1)], 'x.mp4', { type: 'video/mp4' });
    Object.defineProperty(oversized, 'size', { value: VIDEO_MAX_BYTES + 1 });
    await expect(validateVideoForUpload(oversized)).rejects.toThrow('50 MB');
    let duration = 15.5;
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:video', revokeObjectURL: vi.fn() });
    vi.stubGlobal('document', {
      createElement: () => {
        const element = {
          preload: '',
          onloadedmetadata: null as (() => void) | null,
          onerror: null as (() => void) | null,
          duration,
          src: '',
          removeAttribute: vi.fn(),
          load: vi.fn(),
        };
        Object.defineProperty(element, 'src', {
          set: () => {
            element.duration = duration;
            queueMicrotask(() => element.onloadedmetadata?.());
          },
        });
        return element;
      },
    });
    await expect(
      validateVideoForUpload(new File([new Uint8Array(1)], 'ok.mp4', { type: 'video/mp4' })),
    ).resolves.toEqual({ duration: 15.5, mimeType: 'video/mp4' });
    duration = 15.51;
    await expect(
      validateVideoForUpload(new File([new Uint8Array(1)], 'longo.webm', { type: 'video/webm' })),
    ).rejects.toThrow('15 segundos');
    vi.stubGlobal('document', {
      createElement: () => {
        const element = {
          preload: '',
          onloadedmetadata: null as (() => void) | null,
          onerror: null as (() => void) | null,
          duration: Number.NaN,
          src: '',
          removeAttribute: vi.fn(),
          load: vi.fn(),
        };
        Object.defineProperty(element, 'src', {
          set: () => queueMicrotask(() => element.onerror?.()),
        });
        return element;
      },
    });
    await expect(
      validateVideoForUpload(new File([new Uint8Array(1)], 'iphone.mov', { type: '' })),
    ).resolves.toEqual({ duration: null, mimeType: 'video/quicktime' });
    vi.unstubAllGlobals();
  });

  it('7. aceita destinos seguros e rejeita protocol-relative ou barra invertida', () => {
    const valid = (target: string) =>
      highlightFormSchema.safeParse({ title: 'Combo', description: '', target, is_active: true });
    expect(valid('/cardapio').success).toBe(true);
    expect(valid('/produto/uuid').success).toBe(true);
    expect(valid('https://exemplo.com/oferta').success).toBe(true);
    expect(valid('').data?.target).toBeNull();
    ['javascript:alert(1)', 'www.exemplo.com', '//evil.com', '/\\evil.com'].forEach((target) =>
      expect(valid(target).success).toBe(false),
    );
  });

  it('8. mantém a mídia anterior até confirmar o registro e só então limpa a antiga', async () => {
    const calls: string[] = [];
    await commitStagedMedia({
      commit: async () => {
        calls.push('update-registro');
      },
      rollbackStaged: async () => {
        calls.push('remove-nova');
      },
      cleanupPrevious: async () => {
        calls.push('consultar-referências');
        calls.push('remove-antiga');
      },
    });
    expect(calls).toEqual(['update-registro', 'consultar-referências', 'remove-antiga']);
  });

  it('9. em falha de atualização remove a nova e preserva a anterior', async () => {
    const calls: string[] = [];
    await expect(
      commitStagedMedia({
        commit: async () => {
          calls.push('update-registro');
          throw new Error('db indisponível');
        },
        rollbackStaged: async () => {
          calls.push('remove-nova');
        },
        cleanupPrevious: async () => {
          calls.push('remove-antiga');
        },
      }),
    ).rejects.toThrow('db indisponível');
    expect(calls).toEqual(['update-registro', 'remove-nova']);
  });

  it('10. não limpa caminho com referência compartilhada', () => {
    expect(isMediaUnreferenced([false, false, false])).toBe(true);
    expect(isMediaUnreferenced([false, true, false])).toBe(false);
    expect(mediaObjectPaths('products/id/base')).toEqual([
      'products/id/base-detail.webp',
      'products/id/base-card.webp',
    ]);
    expect(mediaObjectPaths('products/id/legado.jpg')).toEqual(['products/id/legado.jpg']);
  });

  it('15. mantém PSNR visível nas variantes detail e card', async () => {
    const source = await noisyJpeg(3200, 1800);
    const compressed = await compressImageToWebp(source);
    const detailReference = await sharp(source)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    const cardReference = await sharp(source)
      .rotate()
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    await expect(psnr(detailReference, compressed.detail)).resolves.toBeGreaterThanOrEqual(35);
    await expect(psnr(cardReference, compressed.card)).resolves.toBeGreaterThanOrEqual(33);
  });

  it('16. remove EXIF, GPS e ICC das saídas', async () => {
    const source = await jpeg(1200, 800, {
      orientation: 6,
      exif: { IFD0: { Copyright: 'Teste' }, IFD3: { GPSLatitude: '123/1', GPSLongitude: '456/1' } },
      icc: 'srgb',
    });
    const sourceMetadata = await sharp(source).metadata();
    // Pré-condição: a entrada realmente carrega EXIF (com GPS), orientação e ICC.
    expect(sourceMetadata.exif).toBeDefined();
    expect(sourceMetadata.orientation).toBe(6);
    expect(sourceMetadata.icc).toBeDefined();
    const compressed = await compressImageToWebp(source);
    const [detail, card] = await Promise.all([
      sharp(compressed.detail).metadata(),
      sharp(compressed.card).metadata(),
    ]);
    expect(detail.exif).toBeUndefined();
    expect(card.exif).toBeUndefined();
    expect(detail.icc).toBeUndefined();
    expect(card.icc).toBeUndefined();
  });
});

describe('Épico 4 — Server Actions com fakes de Supabase/Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      userId: '33333333-3333-4333-8333-333333333333',
      name: 'Admin',
    });
  });

  it('11. recusa remover foto enquanto existe vídeo, sem tocar Storage', async () => {
    const storage = { from: vi.fn() };
    mocks.createClient.mockResolvedValue({
      storage,
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: { image_path: 'products/id/base', video_path: 'products/id/video.mp4' },
              error: null,
            }),
          }),
        }),
      })),
    });
    const result = await removeProductImage(
      initialMediaActionState,
      form({ product_id: productId }),
    );
    expect(result).toMatchObject({
      status: 'error',
      message: expect.stringContaining('Remova o vídeo'),
    });
    expect(storage.from).not.toHaveBeenCalled();
  });

  it('12. recusa tamanho bruto inválido antes de chamar Supabase', async () => {
    const client = vi.fn();
    mocks.createClient.mockImplementation(client);
    const result = await createProductVideoUpload(
      initialMediaActionState,
      form({ product_id: productId, mime_type: 'video/mp4', size: String(52_428_801) }),
    );
    expect(result).toMatchObject({ status: 'error', message: expect.stringContaining('50 MB') });
    expect(client).not.toHaveBeenCalled();
  });

  it('13. cria destaque sem enviar posição e a troca de ordem continua limitada ao par', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const highlights = {
      insert: (values: Record<string, unknown>) => {
        inserted.push(values);
        return {
          select: () => ({ single: async () => ({ data: { id: highlightId }, error: null }) }),
        };
      },
    };
    mocks.createClient.mockResolvedValue({
      from: () => highlights,
    });
    const result = await createHighlight(
      { status: 'idle' },
      form({ title: 'Combo da casa', description: '', target: '/cardapio', is_active: 'on' }),
    );
    expect(result).toMatchObject({ status: 'success', entityId: highlightId });
    expect(inserted[0]).toMatchObject({ title: 'Combo da casa' });
    expect(inserted[0]).not.toHaveProperty('sort_order');
    expect(
      swapSortOrders(
        [
          { id: 'a', sort_order: 0 },
          { id: 'b', sort_order: 1 },
          { id: 'c', sort_order: 2 },
        ],
        'b',
        'up',
      ),
    ).toEqual([
      { id: 'b', sort_order: 0 },
      { id: 'a', sort_order: 1 },
    ]);
  });

  it('14. bloqueia toda mutação de mídia antes de chamar Supabase sem administrador', async () => {
    mocks.requireAdmin.mockResolvedValue(null);
    const client = vi.fn();
    mocks.createClient.mockImplementation(client);
    const calls = await Promise.all([
      uploadProductImage(initialMediaActionState, form({ product_id: productId })),
      removeProductImage(initialMediaActionState, form({ product_id: productId })),
      uploadHighlightImage(initialMediaActionState, form({ highlight_id: highlightId })),
      removeHighlightImage(initialMediaActionState, form({ highlight_id: highlightId })),
      createProductVideoUpload(
        initialMediaActionState,
        form({ product_id: productId, mime_type: 'video/mp4', size: '1024' }),
      ),
      removeProductVideo(initialMediaActionState, form({ product_id: productId })),
    ]);
    calls.forEach((result) =>
      expect(result).toMatchObject({ status: 'error', message: expect.stringContaining('sessão') }),
    );
    expect(client).not.toHaveBeenCalled();
  });

  it('usa o limite de servidor proporcional também para o cálculo de resize', () => {
    expect(fitServerImage({ width: 3200, height: 1800 }, 1600)).toEqual({
      width: 1600,
      height: 900,
    });
  });
});
