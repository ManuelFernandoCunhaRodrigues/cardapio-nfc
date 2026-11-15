import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '@/lib/api/api-request-error';

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

function request(body: unknown, origin = 'https://salgae.test') {
  return new Request('https://salgae.test/admin/midia/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
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
  it('repassa para a API e invalida o catálogo por tags', async () => {
    const response = await POST(request({ productId, path: rawPath }));

    expect(response.status).toBe(200);
    expect(mocks.processVideo).toHaveBeenCalledWith(
      `/v1/admin/products/${productId}/video`,
      rawPath,
    );
    expect(mocks.revalidateTag).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith('/', 'layout');
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

  it.each([401, 403])('preserva erro de autorização %i da API', async (status) => {
    mocks.processVideo.mockRejectedValue(new ApiRequestError(status, 'Acesso negado.'));

    const response = await POST(request({ productId, path: rawPath }));

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ status: 'error', message: 'Acesso negado.' });
  });

  it('recusa outra origem antes de chamar a API', async () => {
    const response = await POST(request({ productId, path: rawPath }, 'https://evil.test'));

    expect(response.status).toBe(403);
    expect(mocks.processVideo).not.toHaveBeenCalled();
  });
});
