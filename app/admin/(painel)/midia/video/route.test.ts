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

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://painel.exemplo.com/admin/midia/video', {
    method: 'POST',
    headers: { origin: 'https://painel.exemplo.com', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function fakeClient(options: {
  updateError?: boolean;
  updateRows?: Array<{ id: string }>;
  referenceError?: Error;
  download?: () => Promise<never>;
  upload?: (path: string) => Promise<never>;
} = {}) {
  const calls: string[] = [];
  const removals: Array<{ bucket: string; paths: string[] }> = [];
  const client = {
    storage: {
      from: (bucket: string) => ({
        download: async (path: string) => { calls.push(`baixar:${path}`); return options.download ? options.download() : { data: new Blob([Buffer.from('bruto')]), error: null }; },
        upload: async (path: string) => { calls.push(`enviar:${path}`); return options.upload ? options.upload(path) : { data: { path }, error: null }; },
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
          eq: () => ({
            select: async () => {
              calls.push('gravar-video-path');
              return { data: options.updateRows ?? [{ id: productId }], error: options.updateError ? new Error('db') : null };
            },
          }),
        }),
      };
    },
  };
  return { client, calls, removals };
}

function concurrentVideoClients(writeOrder: Array<'P1' | 'P2'>, rawPaths: Record<'P1' | 'P2', string>) {
  const originalPath = 'products/anterior.mp4';
  const buckets = {
    'product-videos': new Set([originalPath]),
    'product-video-uploads': new Set(Object.values(rawPaths)),
  };
  const state = { videoPath: originalPath };
  const outputs: Partial<Record<'P1' | 'P2', string>> = {};
  const removals: Array<{ bucket: string; path: string }> = [];
  const currentBarrier = deferred();
  const updatesReady = deferred();
  const gates = { P1: deferred(), P2: deferred() };
  const written = { P1: deferred(), P2: deferred() };
  let currentReads = 0;
  let updateCalls = 0;

  const makeClient = (label: 'P1' | 'P2') => ({
    storage: {
      from: (bucket: 'product-videos' | 'product-video-uploads') => ({
        download: async () => ({ data: new Blob([Buffer.from(`bruto-${label}`)]), error: null }),
        upload: async (path: string) => {
          buckets[bucket].add(path);
          if (bucket === 'product-videos') outputs[label] = path;
          return { data: { path }, error: null };
        },
        remove: async (paths: string[]) => {
          for (const path of paths) {
            removals.push({ bucket, path });
            buckets[bucket].delete(path);
          }
          return { data: null, error: null };
        },
      }),
    },
    from: (table: string) => {
      if (table === 'audit_logs') return { insert: async () => ({ error: null }) };
      return {
        select: (columns: string) => ({
          eq: (_column: string, value: string) => ({
            single: async () => {
              if (columns === 'image_path') return { data: { image_path: 'products/capa' }, error: null };
              const snapshot = state.videoPath;
              currentReads += 1;
              if (currentReads === 2) currentBarrier.resolve();
              await currentBarrier.promise;
              return { data: { video_path: snapshot }, error: null };
            },
            limit: async () => ({ data: state.videoPath === value ? [{ id: productId }] : [], error: null }),
          }),
        }),
        update: ({ video_path: nextPath }: { video_path: string }) => ({
          eq: () => ({
            select: async () => {
              updateCalls += 1;
              if (updateCalls === 2) updatesReady.resolve();
              await gates[label].promise;
              state.videoPath = nextPath;
              written[label].resolve();
              return { data: [{ id: productId }], error: null };
            },
          }),
        }),
      };
    },
  });

  async function releaseWrites() {
    await updatesReady.promise;
    for (const label of writeOrder) {
      gates[label].resolve();
      await written[label].promise;
    }
  }

  return { clients: { P1: makeClient('P1'), P2: makeClient('P2') }, state, buckets, outputs, removals, originalPath, releaseWrites };
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

  it('faz rollback da saída nova quando o produto some antes do update', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rota-video-sem-produto-'));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, 'saida.mp4');
    await writeFile(outputPath, Buffer.from('mp4'));
    mocks.compress.mockResolvedValue({
      outputPath, inputBytes: 10, outputBytes: 3, duration: 1,
      width: 320, height: 180, fps: 24, hdrConverted: false, usedFallback: false, elapsedMs: 5,
    });
    const fake = fakeClient({ updateRows: [] });
    mocks.createClient.mockResolvedValue(fake.client);

    const response = await POST(request({ productId, path: rawPath }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      message: 'O vídeo foi compactado, mas não pôde ser vinculado ao produto. Tente novamente.',
    });
    expect(fake.removals.some(({ bucket, paths }) => bucket === 'product-videos' && paths[0] !== 'products/anterior.mp4')).toBe(true);
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

  it('retorna 504, e tenta apagar o bruto, quando o download não termina', async () => {
    vi.useFakeTimers();
    const started = deferred();
    const fake = fakeClient({ download: () => { started.resolve(); return new Promise<never>(() => undefined); } });
    mocks.createClient.mockResolvedValue(fake.client);

    const pending = POST(request({ productId, path: rawPath }));
    await started.promise;
    await vi.advanceTimersByTimeAsync(60_000);
    const response = await pending;

    expect(response.status).toBe(504);
    expect(fake.removals).toContainEqual({ bucket: 'product-video-uploads', paths: [rawPath] });
    expect(mocks.compress).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('retorna 504, não vincula e tenta apagar a saída quando o upload não termina', async () => {
    vi.useFakeTimers();
    const directory = await mkdtemp(join(tmpdir(), 'rota-video-upload-timeout-'));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, 'saida.mp4');
    await writeFile(outputPath, Buffer.from('mp4'));
    mocks.compress.mockResolvedValue({ outputPath, inputBytes: 10, outputBytes: 3, duration: 1, width: 320, height: 180, fps: 24, hdrConverted: false, usedFallback: false, elapsedMs: 5 });
    const started = deferred();
    const fake = fakeClient({ upload: () => { started.resolve(); return new Promise<never>(() => undefined); } });
    mocks.createClient.mockResolvedValue(fake.client);

    const pending = POST(request({ productId, path: rawPath }));
    await started.promise;
    await vi.advanceTimersByTimeAsync(30_000);
    const response = await pending;

    expect(response.status).toBe(504);
    expect(fake.calls).not.toContain('gravar-video-path');
    expect(fake.removals.some(({ bucket }) => bucket === 'product-videos')).toBe(true);
    vi.useRealTimers();
  });

  it('limita o timeout do ffmpeg ao tempo restante menos a reserva', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rota-video-orcamento-'));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, 'saida.mp4');
    await writeFile(outputPath, Buffer.from('mp4'));
    mocks.compress.mockResolvedValue({ outputPath, inputBytes: 10, outputBytes: 3, duration: 1, width: 320, height: 180, fps: 24, hdrConverted: false, usedFallback: false, elapsedMs: 5 });
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const fake = fakeClient({
      download: async () => {
        now.mockReturnValue(31_000);
        return Promise.resolve(undefined as never);
      },
    });
    fake.client.storage.from = (bucket: string) => ({
      download: async (path: string) => { fake.calls.push(`baixar:${path}`); now.mockReturnValue(31_000); return { data: new Blob([Buffer.from('bruto')]), error: null }; },
      upload: async (path: string) => { fake.calls.push(`enviar:${path}`); return { data: { path }, error: null }; },
      remove: async (paths: string[]) => { fake.removals.push({ bucket, paths }); return { data: null, error: null }; },
    });
    mocks.createClient.mockResolvedValue(fake.client);

    expect((await POST(request({ productId, path: rawPath }))).status).toBe(200);
    expect(mocks.compress).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 120_000 }));
    now.mockRestore();
  });

  it.each([
    ['P1 depois de P2', ['P2', 'P1'] as Array<'P1' | 'P2'>],
    ['P2 depois de P1', ['P1', 'P2'] as Array<'P1' | 'P2'>],
  ])('mantém o objeto do último vínculo em dois processamentos intercalados: %s', async (_case, writeOrder) => {
    const secondRawId = '44444444-4444-4444-8444-444444444444';
    const rawPaths = { P1: rawPath, P2: `uploads/${productId}_${secondRawId}.mov` };
    const outputFiles = await Promise.all(['p1', 'p2'].map(async (label) => {
      const directory = await mkdtemp(join(tmpdir(), `rota-video-${label}-`));
      temporaryDirectories.push(directory);
      const outputPath = join(directory, 'saida.mp4');
      await writeFile(outputPath, Buffer.from(`mp4-${label}`));
      return outputPath;
    }));
    for (const outputPath of outputFiles) {
      mocks.compress.mockResolvedValueOnce({ outputPath, inputBytes: 10, outputBytes: 3, duration: 1, width: 320, height: 180, fps: 24, hdrConverted: false, usedFallback: false, elapsedMs: 5 });
    }
    const fake = concurrentVideoClients(writeOrder, rawPaths);
    mocks.createClient.mockResolvedValueOnce(fake.clients.P1).mockResolvedValueOnce(fake.clients.P2);

    const p1 = POST(request({ productId, path: rawPaths.P1 }));
    const p2 = POST(request({ productId, path: rawPaths.P2 }));
    await fake.releaseWrites();
    const responses = await Promise.all([p1, p2]);

    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    const winner = writeOrder.at(-1)!;
    const loser = writeOrder[0];
    expect(fake.state.videoPath).toBe(fake.outputs[winner]);
    expect(fake.buckets['product-videos'].has(fake.state.videoPath)).toBe(true);
    expect(fake.buckets['product-videos'].has(fake.originalPath)).toBe(false);
    expect(fake.buckets['product-videos'].has(fake.outputs[loser]!)).toBe(true);
    expect(fake.outputs[loser]).not.toBe(fake.state.videoPath);
    expect(fake.removals.filter(({ path }) => path === fake.originalPath)).toHaveLength(2);
    expect(fake.buckets['product-video-uploads'].size).toBe(0);
  });
});
