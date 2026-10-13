import { describe, expect, it, vi } from 'vitest';

import {
  buildHighlightTarget,
  buildOpeningHours,
  creationProgressSteps,
  copyOpeningHourToEveryDay,
  fieldsFromProductSituation,
  filterAdminProducts,
  productSituationFromFields,
  productsNeedingAttention,
  runProductCreationFlow,
  singleFlight,
} from './panel';
import type { AdminProduct } from './catalog';

const base: AdminProduct = {
  id: '1',
  category_id: 'c1',
  name: 'Coxinha de frango',
  description: null,
  price_cents: 700,
  image_path: 'photo',
  video_path: null,
  badge: null,
  sort_order: 0,
  is_active: true,
  is_available: true,
  category: { name: 'Coxinhas', slug: 'coxinhas' },
};

describe('regras do painel', () => {
  it('mapeia uma única situação para os dois campos e de volta', () => {
    expect(fieldsFromProductSituation('menu')).toEqual({ is_active: true, is_available: true });
    expect(fieldsFromProductSituation('unavailable')).toEqual({
      is_active: true,
      is_available: false,
    });
    expect(fieldsFromProductSituation('hidden')).toEqual({ is_active: false, is_available: false });
    expect(productSituationFromFields({ is_active: false, is_available: true })).toBe('hidden');
  });

  it('não repete produtos que precisam de atenção e preserva os dois motivos', () => {
    const rows = productsNeedingAttention([{ ...base, image_path: null, is_available: false }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].reasons).toEqual(['unavailable', 'without-image']);
  });

  it('combina busca sem acento, categoria e filtros da lista', () => {
    const products = [
      base,
      { ...base, id: '2', name: 'Pastel', category_id: 'c2', image_path: null },
      { ...base, id: '3', name: 'Brigadeiro', is_active: false },
    ];
    expect(
      filterAdminProducts(products, { term: 'coxinha', categoryId: 'c1' }).map((item) => item.id),
    ).toEqual(['1']);
    expect(
      filterAdminProducts(products, { filter: 'without-image' }).map((item) => item.id),
    ).toEqual(['2']);
    expect(filterAdminProducts(products, { filter: 'hidden' }).map((item) => item.id)).toEqual([
      '3',
    ]);
  });

  it('monta os quatro destinos do destaque no formato já aceito', () => {
    expect(buildHighlightTarget('menu')).toBe('/cardapio');
    expect(buildHighlightTarget('category', 'coxinhas')).toBe('/cardapio#coxinhas');
    expect(buildHighlightTarget('product', 'abc')).toBe('/produto/abc');
    expect(buildHighlightTarget('custom', 'https://example.com/oferta')).toBe(
      'https://example.com/oferta',
    );
  });

  it('mantém o formato dos sete horários e copia um dia', () => {
    const values = Object.fromEntries(
      Array.from({ length: 7 }, (_, day) => [
        [`open-${day}`, '08:00'],
        [`close-${day}`, '18:00'],
      ]).flat(),
    );
    values['closed-0'] = 'on';
    const hours = buildOpeningHours(values);
    expect(hours).toHaveLength(7);
    expect(hours[0]).toEqual({ day: 0, closed: true, open: '08:00', close: '18:00' });
    expect(copyOpeningHourToEveryDay(hours, 0)[6]).toEqual({
      day: 6,
      closed: true,
      open: '08:00',
      close: '18:00',
    });
  });
});

describe('criação com mídia', () => {
  it('mostra somente as etapas escolhidas e seus estados reais', () => {
    expect(creationProgressSteps({ hasImage: false, hasVideo: false, stage: 'product' })).toEqual([
      { value: 'product', status: 'current' },
    ]);
    expect(creationProgressSteps({ hasImage: true, hasVideo: true, stage: 'image' })).toEqual([
      { value: 'product', status: 'complete' },
      { value: 'image', status: 'current' },
      { value: 'video', status: 'pending' },
    ]);
    expect(
      creationProgressSteps({
        hasImage: true,
        hasVideo: false,
        stage: 'image',
        failedStep: 'image',
      }),
    ).toEqual([
      { value: 'product', status: 'complete' },
      { value: 'image', status: 'failed' },
    ]);
  });

  it('executa produto, foto e vídeo nessa ordem', async () => {
    const stages: string[] = [];
    const result = await runProductCreationFlow({
      createProduct: async () => ({ productId: 'p1' }),
      uploadImage: async () => undefined,
      uploadVideo: async () => undefined,
      onStage: (stage) => stages.push(stage),
    });
    expect(stages).toEqual(['product', 'image', 'video', 'done']);
    expect(result).toEqual({ productId: 'p1', image: 'success', video: 'success' });
  });

  it('preserva o produto quando foto ou vídeo falham', async () => {
    const imageFailure = await runProductCreationFlow({
      createProduct: async () => ({ productId: 'p1' }),
      uploadImage: async () => {
        throw new Error('foto');
      },
      uploadVideo: async () => undefined,
    });
    expect(imageFailure).toEqual({ productId: 'p1', image: 'error', video: 'skipped' });
    const videoFailure = await runProductCreationFlow({
      createProduct: async () => ({ productId: 'p2' }),
      uploadImage: async () => undefined,
      uploadVideo: async () => {
        throw new Error('vídeo');
      },
    });
    expect(videoFailure).toEqual({ productId: 'p2', image: 'success', video: 'error' });
  });

  it('reaproveita a mesma promessa durante toque duplo', async () => {
    let resolve!: (value: number) => void;
    const task = vi.fn(
      () =>
        new Promise<number>((done) => {
          resolve = done;
        }),
    );
    const guarded = singleFlight(task);
    const first = guarded();
    const second = guarded();
    expect(first).toBe(second);
    expect(task).toHaveBeenCalledTimes(1);
    resolve(1);
    await first;
    const third = guarded();
    resolve(2);
    await third;
    expect(task).toHaveBeenCalledTimes(2);
  });
});
