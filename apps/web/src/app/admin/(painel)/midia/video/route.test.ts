import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError, SESSION_EXPIRED_MESSAGE } from '@/lib/api/api-request-error';
import { cacheTags } from '@/lib/cache/cache-tags';

const mocks = vi.hoisted(() => ({
  processVideo: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  report: vi.fn(),
}));

vi.mock('@/lib/api/admin-api-client', () => ({
  adminApi: () => ({ processVideo: mocks.processVideo }),
}));
vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.report }));

import { POST } from './route';

const productId = '11111111-1111-4111-8111-111111111111';
const rawPath = `uploads/${productId}_22222222-2222-4222-8222-222222222222.mp4`;

function request(
  body: unknown,
  origin = 'https://salgae.test',
  headers: Record<string, string> = {},
) {
  return new Request('https://salgae.test/admin/midia/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, ...headers },
    body: JSON.stringify(body),
  });
}

function requestWithInvalidJson() {
  return new Request('https://salgae.test/admin/midia/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://salgae.test' },
    body: '{',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.processVideo.mockResolvedValue({
    status: 'success',
    message: 'Vídeo compactado e salvo: 10,0 MB → 2,0 MB.',
    path: `products/${productId}/novo.mp4`,
    originalBytes: 10_000_000,
    compressedBytes: 2_000_000,
  });
});

describe('proxy do processamento de vídeo', () => {
  it('repassa para a API e faz somente as invalidações específicas', async () => {
    const response = await POST(request({ productId, path: rawPath }));

    expect(response.status).toBe(200);
    expect(mocks.processVideo).toHaveBeenCalledWith(
      `/v1/admin/products/${productId}/video`,
      rawPath,
    );
    expect(mocks.revalidateTag.mock.calls).toEqual([
      [cacheTags.menu, { expire: 0 }],
      [cacheTags.product(productId), { expire: 0 }],
    ]);
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ['/admin'],
      ['/admin/produtos'],
      [`/admin/produtos/${productId}`],
    ]);
  });

  it('retorna 400 para JSON inválido', async () => {
    const response = await POST(requestWithInvalidJson());

    expect(response.status).toBe(400);
    expect(mocks.processVideo).not.toHaveBeenCalled();
  });

  it('retorna 400 para corpo fora do schema', async () => {
    const response = await POST(request({ productId: 'inválido', path: '' }));

    expect(response.status).toBe(400);
    expect(mocks.processVideo).not.toHaveBeenCalled();
  });

  it('preserva o status e a mensagem de erro da API', async () => {
    mocks.processVideo.mockRejectedValue(new ApiRequestError(409, 'O vídeo mudou em outra aba.'));

    const response = await POST(request({ productId, path: rawPath }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      status: 'error',
      message: 'O vídeo mudou em outra aba.',
    });
  });

  it('usa o texto único de sessão expirada no 401 da API', async () => {
    mocks.processVideo.mockRejectedValue(new ApiRequestError(401, 'Texto da API.'));

    const response = await POST(request({ productId, path: rawPath }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ status: 'error', message: SESSION_EXPIRED_MESSAGE });
  });

  it('preserva o erro de permissão 403 da API', async () => {
    mocks.processVideo.mockRejectedValue(new ApiRequestError(403, 'Acesso negado.'));

    const response = await POST(request({ productId, path: rawPath }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ status: 'error', message: 'Acesso negado.' });
  });

  it('recusa outra origem antes de chamar a API', async () => {
    const response = await POST(request({ productId, path: rawPath }, 'https://evil.test'));

    expect(response.status).toBe(403);
    expect(mocks.processVideo).not.toHaveBeenCalled();
  });

  it('recusa sec-fetch-site cross-site mesmo com a mesma origem', async () => {
    const response = await POST(
      request({ productId, path: rawPath }, 'https://salgae.test', {
        'sec-fetch-site': 'cross-site',
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.processVideo).not.toHaveBeenCalled();
  });

  it('usa x-forwarded-host para validar a origem do proxy', async () => {
    const response = await POST(
      request({ productId, path: rawPath }, 'https://painel.salgae.test', {
        'x-forwarded-host': 'painel.salgae.test',
        'sec-fetch-site': 'same-origin',
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.processVideo).toHaveBeenCalledOnce();
  });

  it('retorna 500 e reporta um erro inesperado', async () => {
    const failure = new Error('falha inesperada');
    mocks.processVideo.mockRejectedValue(failure);

    const response = await POST(request({ productId, path: rawPath }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      status: 'error',
      message: 'Não foi possível processar o vídeo agora. Tente novamente.',
    });
    expect(mocks.report).toHaveBeenCalledWith('media_video_proxy_failed', failure);
  });
});
