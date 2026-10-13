import { mkdtemp, open, readFile, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildEncodeArguments, buildProbeArguments } from './arguments';
import {
  VIDEO_DURATION_TOLERANCE_SECONDS,
  VIDEO_OUTPUT_MAX_BYTES,
  VIDEO_PROBE_TIMEOUT_MS,
  VIDEO_PROCESSING_TIMEOUT_MS,
  VIDEO_RAW_MAX_BYTES,
} from './constants';
import { asVideoError, VideoCompressionError } from './errors';
import { parseFfmpegMetadata, validateInputMetadata, type VideoMetadata } from './metadata';
import { hasFastStart } from './mp4';
import { runFfmpeg, type ProcessResult } from './process';
import { detectVideoContainer, type VideoContainer } from './signature';

export type CompressVideoFileOptions = {
  inputPath: string;
  workDir?: string;
  maxOutputBytes?: number;
  timeoutMs?: number;
  threads?: number;
};

export type CompressedVideo = {
  outputPath: string;
  inputBytes: number;
  outputBytes: number;
  duration: number;
  width: number;
  height: number;
  fps: number | null;
  hdrConverted: boolean;
  usedFallback: boolean;
  elapsedMs: number;
};

async function readSignature(path: string): Promise<Uint8Array> {
  const file = await open(path, 'r');
  try {
    const bytes = Buffer.alloc(4_096);
    const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
    return bytes.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
}

async function probe(
  path: string,
  container: VideoContainer,
  timeoutMs: number,
): Promise<VideoMetadata> {
  const result = await runFfmpeg(
    buildProbeArguments(path, container),
    Math.min(VIDEO_PROBE_TIMEOUT_MS, timeoutMs),
  );
  if (result.timedOut) throw new VideoCompressionError('video_timeout');
  return parseFfmpegMetadata(result.stderr);
}

function remainingTime(startedAt: number, timeoutMs: number): number {
  const remaining = timeoutMs - (Date.now() - startedAt);
  if (remaining <= 0) throw new VideoCompressionError('video_timeout');
  return remaining;
}

async function encode(args: string[], timeoutMs: number): Promise<ProcessResult> {
  const result = await runFfmpeg(args, timeoutMs);
  if (result.timedOut) throw new VideoCompressionError('video_timeout');
  if (result.exitCode !== 0)
    throw new VideoCompressionError(
      'video_compress_failed',
      `ffmpeg terminou com código ${result.exitCode}`,
    );
  return result;
}

async function validateOutput(
  path: string,
  expected: { width: number; height: number },
  timeoutMs: number,
): Promise<VideoMetadata> {
  const bytes = await readFile(path);
  if (!hasFastStart(bytes)) throw new VideoCompressionError('video_compress_failed');
  const metadata = await probe(path, { kind: 'mp4', demuxer: 'mov' }, timeoutMs);
  if (
    metadata.videoStreams !== 1 ||
    metadata.audioStreams !== 0 ||
    metadata.codec !== 'h264' ||
    metadata.duration === null ||
    metadata.width !== expected.width ||
    metadata.height !== expected.height
  )
    throw new VideoCompressionError('video_compress_failed');
  if (metadata.duration > VIDEO_DURATION_TOLERANCE_SECONDS)
    throw new VideoCompressionError('video_too_long');
  return metadata;
}

/**
 * Em sucesso, o arquivo e seu diretório passam a pertencer ao chamador, que deve
 * removê-los depois do upload. Em qualquer erro, esta função remove tudo o que criou.
 */
export async function compressVideoFile(
  options: CompressVideoFileOptions,
): Promise<CompressedVideo> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? VIDEO_PROCESSING_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? VIDEO_OUTPUT_MAX_BYTES;
  let caseDir: string | undefined;
  let succeeded = false;
  try {
    const inputStat = await stat(options.inputPath);
    if (!inputStat.isFile() || inputStat.size <= 0)
      throw new VideoCompressionError('video_invalid');
    if (inputStat.size > VIDEO_RAW_MAX_BYTES) throw new VideoCompressionError('video_too_large');
    const container = detectVideoContainer(await readSignature(options.inputPath));
    const inputMetadata = await probe(
      options.inputPath,
      container,
      remainingTime(startedAt, timeoutMs),
    );
    validateInputMetadata(inputMetadata);
    if (
      inputMetadata.duration !== null &&
      inputMetadata.duration > VIDEO_DURATION_TOLERANCE_SECONDS
    ) {
      throw new VideoCompressionError('video_too_long');
    }

    caseDir = await mkdtemp(join(options.workDir ?? tmpdir(), 'salgae-video-'));
    const outputPath = join(caseDir, 'video.mp4');
    const first = buildEncodeArguments({
      inputPath: options.inputPath,
      outputPath,
      container,
      metadata: inputMetadata,
      threads: options.threads,
    });
    await encode(first.args, remainingTime(startedAt, timeoutMs));
    let outputStat = await stat(outputPath);
    let usedFallback = false;
    let expected = first.dimensions;
    if (outputStat.size > maxOutputBytes) {
      usedFallback = true;
      const fallback = buildEncodeArguments({
        inputPath: options.inputPath,
        outputPath,
        container,
        metadata: inputMetadata,
        fallback: true,
        threads: options.threads,
      });
      expected = fallback.dimensions;
      await encode(fallback.args, remainingTime(startedAt, timeoutMs));
      outputStat = await stat(outputPath);
      if (outputStat.size > maxOutputBytes)
        throw new VideoCompressionError('video_output_too_large');
    }
    const outputMetadata = await validateOutput(
      outputPath,
      expected,
      remainingTime(startedAt, timeoutMs),
    );
    if (outputStat.size > maxOutputBytes) throw new VideoCompressionError('video_output_too_large');
    succeeded = true;
    return {
      outputPath,
      inputBytes: inputStat.size,
      outputBytes: outputStat.size,
      duration: outputMetadata.duration!,
      width: outputMetadata.width,
      height: outputMetadata.height,
      fps: outputMetadata.fps,
      hdrConverted: inputMetadata.transfer !== null,
      usedFallback,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    throw asVideoError(error, 'video_compress_failed');
  } finally {
    if (!succeeded && caseDir) await rm(caseDir, { recursive: true, force: true });
  }
}

export async function removeCompressedVideo(
  result: Pick<CompressedVideo, 'outputPath'>,
): Promise<void> {
  await rm(dirname(result.outputPath), { recursive: true, force: true });
}
