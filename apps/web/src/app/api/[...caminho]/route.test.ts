import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ handleApiRoute: vi.fn() }));

vi.mock('@/lib/api/embedded-api', () => ({ handleApiRoute: mocks.handleApiRoute }));

import { POST } from './route';

describe('rota pública da API embutida', () => {
  it('recusa o processamento longo de vídeo com 501', async () => {
    const response = await POST(
      new Request(
        'https://salgae.test/api/v1/admin/products/11111111-1111-4111-8111-111111111111/video',
        { method: 'POST' },
      ),
    );

    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({
      status: 'error',
      message: expect.stringContaining('rota dedicada do painel'),
    });
    expect(mocks.handleApiRoute).not.toHaveBeenCalled();
  });

  it('continua encaminhando os demais POSTs', async () => {
    const expected = Response.json({ ok: true });
    mocks.handleApiRoute.mockResolvedValue(expected);
    const request = new Request('https://salgae.test/api/v1/admin/products', { method: 'POST' });

    await expect(POST(request)).resolves.toBe(expected);
    expect(mocks.handleApiRoute).toHaveBeenCalledWith(request);
  });
});
