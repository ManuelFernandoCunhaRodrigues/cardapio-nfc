import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authorization: vi.fn(),
  createClient: vi.fn(),
  compress: vi.fn(),
  removeCompressed: vi.fn(),
  revalidatePath: vi.fn(),
  report: vi.fn(),
}));

vi.mock('@/lib/admin/require-admin', () => ({ getAdminAuthorization: mocks.authorization }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.report }));
vi.mock('@/lib/media/video', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/media/video')>();
  return { ...original, compressVideoFile: mocks.compress, removeCompressedVideo: mocks.removeCompressed };
});

import { POST } from './route';
import { VideoCompressionError } from '@/lib/media/video';

const productId = '11111111-1111-4111-8111-111111111111';
const rawId = '22222222-2222-4222-8222-222222222222';
const rawPath = `uploads/${productId}_${rawId}.mov`;
const temporaryDirectories: string[] = [];

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://painel.exemplo.com/admin/midia/video', {
    method: 'POST',
    headers: { origin: 'https://painel.exemplo.com', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function fakeClient(options: { updateError?: boolean; referenceError?: Error } = {}) {
  const calls: string[] = [];
  const removals: Array<{ bucket: string; paths: string[] }> = [];
  const client = {
    storage: {
      from: (bucket: string) => ({
        download: async (path: string) => { calls.push(`baixar:${path}`); return { data: new Blob([Buffer.from('bruto')]), error: null }; },
        upload: async (path: string) => { calls.push(`enviar:${path}`); return { data: { path }, error: null }; },
        remove: async (paths: string[]) => { calls.push(`remover:${bucket}:${paths[0]}`); removals.push({ bucket, paths }); return { data: null, error: null }; },
      }),
    },
    from: (table: string) => {
      if (table === 'audit_logs') return {
        insert: async () => { calls.push('auditar'); return { error: null }; },
      };
      return {
        select: (columns: string) => ({
          eq: () => ({
            single: async () => {
              calls.push(`ler:${columns}`);
              return columns === 'image_path'
                ? { data: { image_path: 'products/capa' }, error: null }
                : { data: { video_path: 'products/anterior.mp4' }, error: null };
            },
            limit: async () => {
              calls.push('reler-referencias');
              if (options.referenceError) throw options.referenceError;
              return { data: [], error: null };
            },
          }),
        }),
        update: () => ({
          eq: async () => { calls.push('gravar-video-path'); return { error: options.updateError ? new Error('db') : null }; },
        }),
      };
    },
  };
  return { client, calls, removals };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorization.mockResolvedValue({ status: 'authorized', admin: { userId: '33333333-3333-4333-8333-333333333333', name: 'Admin' } });
  mocks.removeCompressed.mockResolvedValue(undefined);
});

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('POST /admin/midia/video', () => {
  it.each([
    [{ origin: '' }, {}, 403],
    [{ origin: 'null' }, {}, 403],
    [{ origin: 'https://outro.exemplo.com' }, {}, 403],
    [{ 'sec-fetch-site': 'cross-site' }, {}, 403],
  ])('bloqueia CSRF antes de sessão e trabalho (%o)', async (headers, body, status) => {
    const response = await POST(new Request('https://painel.exemplo.com/admin/midia/video', {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://painel.exemplo.com', ...headers }, body: JSON.stringify(body),
    }));
    expect(response.status).toBe(status);
    expect(mocks.authorization).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.compress).not.toHaveBeenCalled();
  });

  it('distingue sessão ausente (401) de perfil sem permissão (403)', async () => {
    mocks.authorization.mockResolvedValueOnce({ status: 'unauthenticated' }).mockResolvedValueOnce({ status: 'forbidden' });
    expect((await POST(request({ productId, path: rawPath }))).status).toBe(401);
    expect((await POST(request({ productId, path: rawPath }))).status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('allows matching forwarded host through a reverse proxy', async () => {
    const response = await POST(new Request('http://localhost:3000/admin/midia/video', {
      method: 'POST',
      headers: { origin: 'https://painel.exemplo.com', host: 'painel.exemplo.com', 'x-forwarded-host': 'painel.exemplo.com, nginx-interno', 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(400);
    expect(mocks.authorization).toHaveBeenCalledOnce();
  });

  it('rejects an Origin different from x-forwarded-host', async () => {
    const response = await POST(new Request('http://localhost:3000/admin/midia/video', {
      method: 'POST',
      headers: { origin: 'https://painel.exemplo.com', host: 'painel.exemplo.com', 'x-forwarded-host': 'outro.exemplo.com', 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(403);
    expect(mocks.authorization).not.toHaveBeenCalled();
  });

  it('recusa corpo e caminho de outro produto antes de Storage/ffmpeg', async () => {
    expect((await POST(request({ productId: 'inválido', path: rawPath }))).status).toBe(400);
    expect((await POST(request({ productId, path: `uploads/44444444-4444-4444-8444-444444444444_${rawId}.mov` }))).status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.compress).not.toHaveBeenCalled();
  });

  it('publica, grava, limpa o anterior e sempre apaga o bruto na ordem segura', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rota-video-teste-'));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, 'saida.mp4');
    await writeFile(outputPath, Buffer.from('mp4 compactado'));
    mocks.compress.mockImplementation(async () => ({
      outputPath, inputBytes: 30_000_000, outputBytes: 2_000_000, duration: 15,
      width: 1280, height: 720, fps: 30, hdrConverted: false, usedFallback: false, elapsedMs: 100,
    }));
    const fake = fakeClient();
    mocks.createClient.mockResolvedValue(fake.client);

    const response = await POST(request({ productId, path: rawPath }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ status: 'success', originalBytes: 30_000_000, compressedBytes: 2_000_000 });
    const compactIndex = fake.calls.findIndex((call) => call.startsWith('enviar:'));
    expect(fake.calls.indexOf('gravar-video-path')).toBeGreaterThan(compactIndex);
    expect(fake.calls.indexOf('reler-referencias')).toBeGreaterThan(fake.calls.indexOf('gravar-video-path'));
    expect(fake.calls.indexOf('auditar')).toBeGreaterThan(fake.calls.indexOf('reler-referencias'));
    expect(fake.removals).toContainEqual({ bucket: 'product-videos', paths: ['products/anterior.mp4'] });
    expect(fake.removals).toContainEqual({ bucket: 'product-video-uploads', paths: [rawPath] });
  });

  it('faz rollback da saída nova e preserva a anterior quando o banco falha', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rota-video-rollback-'));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, 'saida.mp4');
    await writeFile(outputPath, Buffer.from('mp4'));
    mocks.compress.mockResolvedValue({
      outputPath, inputBytes: 10, outputBytes: 3, duration: 1,
      width: 320, height: 180, fps: 24, hdrConverted: false, usedFallback: false, elapsedMs: 5,
    });
    const fake = fakeClient({ updateError: true });
    mocks.createClient.mockResolvedValue(fake.client);
    const response = await POST(request({ productId, path: rawPath }));
    expect(response.status).toBe(500);
    const removedFinal = fake.removals.filter(({ bucket, paths }) => bucket === 'product-videos' && paths[0] !== 'products/anterior.mp4');
    expect(removedFinal.length).toBeGreaterThan(0);
    expect(fake.removals).not.toContainEqual({ bucket: 'product-videos', paths: ['products/anterior.mp4'] });
    expect(fake.removals).toContainEqual({ bucket: 'product-video-uploads', paths: [rawPath] });
  });

  it('tenta apagar o bruto mesmo quando a compactação falha', async () => {
    mocks.compress.mockRejectedValue(new Error('falha interna'));
    const fake = fakeClient();
    mocks.createClient.mockResolvedValue(fake.client);
    const response = await POST(request({ productId, path: rawPath }));
    expect(response.status).toBe(500);
    expect(fake.removals).toContainEqual({ bucket: 'product-video-uploads', paths: [rawPath] });
    expect(await response.json()).toEqual({
      status: 'error',
      message: 'Não foi possível compactar este vídeo. Tente um vídeo mais curto ou gravado em Full HD.',
    });
  });

  it('keeps the new output when previous-video cleanup throws', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rota-video-faxina-'));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, 'saida.mp4');
    await writeFile(outputPath, Buffer.from('mp4'));
    mocks.compress.mockResolvedValue({ outputPath, inputBytes: 10, outputBytes: 3, duration: 1, width: 320, height: 180, fps: 24, hdrConverted: false, usedFallback: false, elapsedMs: 5 });
    const fake = fakeClient({ referenceError: new Error('reference lookup failed') });
    mocks.createClient.mockResolvedValue(fake.client);
    expect((await POST(request({ productId, path: rawPath }))).status).toBe(200);
    expect(fake.removals).not.toContainEqual(expect.objectContaining({ bucket: 'product-videos' }));
    expect(fake.removals).toContainEqual({ bucket: 'product-video-uploads', paths: [rawPath] });
  });

  it('returns 504 for a compression timeout', async () => {
    mocks.compress.mockRejectedValue(new VideoCompressionError('video_timeout', 'ffmpeg terminou com código 137'));
    const fake = fakeClient();
    mocks.createClient.mockResolvedValue(fake.client);
    const response = await POST(request({ productId, path: rawPath }));
    expect(response.status).toBe(504);
    expect(mocks.report).toHaveBeenCalledWith('media_video_compression_failed', {
      code: 'video_timeout', detail: 'ffmpeg terminou com código 137',
    });
    await expect(response.json()).resolves.toMatchObject({ message: 'A compactação demorou mais que o esperado. Tente novamente.' });
  });
});
