import { spawn } from 'node:child_process';
import { chmod, copyFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { access } from 'node:fs/promises';

import ffmpegStatic from 'ffmpeg-static';

import { VideoCompressionError } from './errors';

const STDERR_LIMIT = 512 * 1024;
let executableCopyPath: string | undefined;

export async function resolveFfmpegPath(): Promise<string> {
  const binary = process.env.FFMPEG_PATH?.trim() || ffmpegStatic;
  if (!binary) throw new VideoCompressionError('video_compress_failed', 'Binário do ffmpeg não disponível.');
  try {
    await access(binary);
  } catch (error) {
    throw new VideoCompressionError('video_compress_failed', 'Binário do ffmpeg não encontrado.', { cause: error });
  }
  return binary;
}

export type ProcessResult = { exitCode: number | null; stderr: string; timedOut: boolean };

type ProcessDependencies = {
  spawn: typeof spawn;
  copyFile: typeof copyFile;
  chmod: typeof chmod;
  mkdir: typeof mkdir;
  tmpdir: () => string;
  platform: NodeJS.Platform;
};

const defaultDependencies: ProcessDependencies = { spawn, copyFile, chmod, mkdir, tmpdir, platform: process.platform };

function startProcess(binary: string, args: readonly string[], timeoutMs: number, spawnProcess: typeof spawn): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawnProcess(binary, [...args], { shell: false, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (error) {
      reject(error);
      return;
    }
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, Math.max(1, timeoutMs));
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < STDERR_LIMIT) stderr += chunk.toString('utf8', 0, STDERR_LIMIT - stderr.length);
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stderr, timedOut });
    });
  });
}

function isPermissionError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && ((error as NodeJS.ErrnoException).code === 'EACCES' || (error as NodeJS.ErrnoException).code === 'EPERM');
}

function startError(error: unknown): VideoCompressionError {
  if (typeof error === 'object' && error !== null && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
    return new VideoCompressionError('video_compress_failed', 'Binário do ffmpeg não encontrado.', { cause: error });
  }
  return new VideoCompressionError('video_compress_failed', 'Falha ao iniciar o ffmpeg.', { cause: error });
}

/** A cópia em tmp contorna pacotes Linux cujo binário perdeu o bit executável. */
export async function runFfmpegWithDependencies(
  args: readonly string[],
  timeoutMs: number,
  binaryPath: string | undefined,
  dependencies: ProcessDependencies,
): Promise<ProcessResult> {
  const binary = executableCopyPath ?? binaryPath ?? await resolveFfmpegPath();
  try {
    return await startProcess(binary, args, timeoutMs, dependencies.spawn);
  } catch (error) {
    if (!isPermissionError(error) || dependencies.platform === 'win32' || executableCopyPath) throw startError(error);
  }

  const copiedBinary = join(dependencies.tmpdir(), 'salgae-ffmpeg', 'ffmpeg');
  try {
    await dependencies.mkdir(join(dependencies.tmpdir(), 'salgae-ffmpeg'), { recursive: true });
    await dependencies.copyFile(binary, copiedBinary);
    await dependencies.chmod(copiedBinary, 0o755);
  } catch (error) {
    throw new VideoCompressionError('video_compress_failed', 'ffmpeg sem permissão de execução', { cause: error });
  }

  executableCopyPath = copiedBinary;
  try {
    return await startProcess(copiedBinary, args, timeoutMs, dependencies.spawn);
  } catch (error) {
    throw startError(error);
  }
}

/** Executa sem shell; no timeout mata o processo e somente resolve depois de `close`. */
export async function runFfmpeg(args: readonly string[], timeoutMs: number, binaryPath?: string): Promise<ProcessResult> {
  return runFfmpegWithDependencies(args, timeoutMs, binaryPath, defaultDependencies);
}

export function resetFfmpegExecutableCacheForTests(): void {
  executableCopyPath = undefined;
}
