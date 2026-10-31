import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../shared/errors/domain-errors.js';
import { HighlightsService, type HighlightRepository } from './highlights.service.js';

const highlightId = '33333333-3333-4333-8333-333333333333';

function fakeRepository(overrides: Partial<HighlightRepository> = {}): HighlightRepository {
  return {
    listForAdmin: async () => [],
    create: async () => highlightId,
    update: async () => true,
    setActive: async () => true,
    listSortOrders: async () => [],
    swapSortOrders: async () => undefined,
    delete: async () => ({ imagePath: 'highlights/promo' }),
    isImageInUse: async () => false,
    removeImageFiles: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('HighlightsService', () => {
  it('apaga as duas variantes da imagem que ficou sem uso', async () => {
    const repository = fakeRepository();

    await new HighlightsService(repository).deleteHighlight(highlightId);

    expect(repository.removeImageFiles).toHaveBeenCalledWith([
      'highlights/promo-detail.webp',
      'highlights/promo-card.webp',
    ]);
  });

  it('mantém a imagem que outro destaque ainda usa', async () => {
    const repository = fakeRepository({ isImageInUse: async () => true });

    await new HighlightsService(repository).deleteHighlight(highlightId);

    expect(repository.removeImageFiles).not.toHaveBeenCalled();
  });

  it('conclui a exclusão mesmo se a limpeza da imagem falhar', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = fakeRepository({
      removeImageFiles: async () => {
        throw new Error('storage offline');
      },
    });

    await expect(
      new HighlightsService(repository).deleteHighlight(highlightId),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('highlight.image_cleanup_failed'));
    log.mockRestore();
  });

  it('avisa quando o destaque apagado não existe', async () => {
    const service = new HighlightsService(fakeRepository({ delete: async () => null }));

    await expect(service.deleteHighlight(highlightId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
