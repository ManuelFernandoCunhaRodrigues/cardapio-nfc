import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resetFfmpegExecutableCacheForTests,
  runFfmpeg,
  runFfmpegWithDependencies,
} from './process';

function successfulChild() {
  const child = new EventEmitter() as EventEmitter & {
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stderr = new PassThrough();
  child.kill = vi.fn();
  queueMicrotask(() => child.emit('close', 0));
  return child;
}

function failedChild(code: 'EACCES' | 'EPERM') {
  const child = new EventEmitter() as EventEmitter & {
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stderr = new PassThrough();
  child.kill = vi.fn();
  queueMicrotask(() => child.emit('error', Object.assign(new Error(code), { code })));
  return child;
}

afterEach(() => resetFfmpegExecutableCacheForTests());

describe('executor de processo', () => {
  it('mata no timeout e espera o evento close', async () => {
    const result = await runFfmpeg(['-e', 'setInterval(() => {}, 1000)'], 50, process.execPath);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
  }, 5_000);

  it('copia o binário sem permissão, aplica chmod e reutiliza a cópia em cache', async () => {
    const spawn = vi
      .fn()
      .mockImplementationOnce(() => failedChild('EACCES'))
      .mockImplementation(() => successfulChild());
    const copyFile = vi.fn().mockResolvedValue(undefined);
    const chmod = vi.fn().mockResolvedValue(undefined);
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const dependencies = {
      spawn: spawn as unknown as typeof import('node:child_process').spawn,
      copyFile,
      chmod,
      mkdir,
      tmpdir: () => '/tmp',
      platform: 'linux' as NodeJS.Platform,
    };
    const copiedBinary = join('/tmp', 'salgae-ffmpeg', 'ffmpeg');

    await expect(
      runFfmpegWithDependencies(['-version'], 1_000, '/pacote/ffmpeg', dependencies),
    ).resolves.toMatchObject({ exitCode: 0 });
    await expect(
      runFfmpegWithDependencies(['-version'], 1_000, '/outro/ffmpeg', dependencies),
    ).resolves.toMatchObject({ exitCode: 0 });

    expect(copyFile).toHaveBeenCalledOnce();
    expect(copyFile).toHaveBeenCalledWith('/pacote/ffmpeg', copiedBinary);
    expect(chmod).toHaveBeenCalledWith(copiedBinary, 0o755);
    expect(spawn.mock.calls.map(([binary]) => binary)).toEqual([
      '/pacote/ffmpeg',
      copiedBinary,
      copiedBinary,
    ]);
  });

  it('retorna erro tipado quando não consegue copiar o binário sem permissão', async () => {
    const spawn = vi.fn(() => failedChild('EACCES'));
    const dependencies = {
      spawn: spawn as unknown as typeof import('node:child_process').spawn,
      copyFile: vi.fn().mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' })),
      chmod: vi.fn(),
      mkdir: vi.fn().mockResolvedValue(undefined),
      tmpdir: () => '/tmp',
      platform: 'linux' as NodeJS.Platform,
    };

    await expect(
      runFfmpegWithDependencies(['-version'], 1_000, '/pacote/ffmpeg', dependencies),
    ).rejects.toMatchObject({
      code: 'video_compress_failed',
      message: 'ffmpeg sem permissão de execução',
    });
  });

  it('não tenta copiar no Windows', async () => {
    const copyFile = vi.fn();
    const dependencies = {
      spawn: vi.fn(() =>
        failedChild('EPERM'),
      ) as unknown as typeof import('node:child_process').spawn,
      copyFile,
      chmod: vi.fn(),
      mkdir: vi.fn(),
      tmpdir: () => '/tmp',
      platform: 'win32' as NodeJS.Platform,
    };

    await expect(
      runFfmpegWithDependencies(['-version'], 1_000, 'C:\\ffmpeg.exe', dependencies),
    ).rejects.toMatchObject({
      code: 'video_compress_failed',
      message: 'Falha ao iniciar o ffmpeg.',
    });
    expect(copyFile).not.toHaveBeenCalled();
  });
});
