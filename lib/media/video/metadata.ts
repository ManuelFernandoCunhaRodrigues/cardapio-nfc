import { VIDEO_MAX_PIXELS, VIDEO_MAX_SIDE } from './constants';
import { VideoCompressionError } from './errors';

export type VideoMetadata = {
  duration: number | null;
  width: number;
  height: number;
  rotation: number;
  fps: number | null;
  transfer: 'arib-std-b67' | 'smpte2084' | null;
  videoStreams: number;
  audioStreams: number;
  codec: string | null;
  pixelFormat: string | null;
};

function parseDuration(stderr: string): number | null {
  const value = stderr.match(/Duration:\s*(N\/A|\d{2}:\d{2}:\d{2}(?:\.\d+)?)/i)?.[1];
  if (!value || value.toUpperCase() === 'N/A') return null;
  const [hours, minutes, seconds] = value.split(':').map(Number);
  const duration = hours * 3_600 + minutes * 60 + seconds;
  return Number.isFinite(duration) ? duration : null;
}

function normalizeRotation(value: number): number {
  return ((Math.round(value) % 360) + 360) % 360;
}

/** Lê o texto real emitido por `ffmpeg -i`, inclusive saídas sem duração declarada. */
export function parseFfmpegMetadata(stderr: string): VideoMetadata {
  const streamLines = stderr.split(/\r?\n/).filter((line) => /Stream #\d+:/i.test(line));
  const videoLines = streamLines.filter((line) => /Video:/i.test(line));
  const audioStreams = streamLines.filter((line) => /Audio:/i.test(line)).length;
  const primary = videoLines[0];
  if (!primary) throw new VideoCompressionError('video_invalid');

  const dimensions = primary.match(/(?:^|[,\s])(\d{2,5})x(\d{2,5})(?:\s|[,\[])/);
  if (!dimensions) throw new VideoCompressionError('video_invalid');
  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);
  const codec = primary.match(/Video:\s*([^,\s]+)/i)?.[1]?.toLowerCase() ?? null;
  const pixelFormat = primary.match(/Video:\s*[^,]+,\s*([^,(\s]+)/i)?.[1]?.toLowerCase() ?? null;
  const fpsValue = primary.match(/([0-9]+(?:\.[0-9]+)?)\s*fps\b/i)?.[1];

  const rotateTag = stderr.match(/rotate\s*:\s*(-?[0-9.]+)/i)?.[1];
  const displayMatrix = stderr.match(/rotation(?:\s+of)?\s+(-?[0-9.]+)\s+degrees/i)?.[1];
  const rotation = normalizeRotation(Number(displayMatrix ?? rotateTag ?? 0));
  const transfer = /arib-std-b67/i.test(primary) || /arib-std-b67/i.test(stderr)
    ? 'arib-std-b67'
    : /smpte2084/i.test(primary) || /smpte2084/i.test(stderr)
      ? 'smpte2084'
      : null;

  return {
    duration: parseDuration(stderr),
    width,
    height,
    rotation,
    fps: fpsValue ? Number(fpsValue) : null,
    transfer,
    videoStreams: videoLines.length,
    audioStreams,
    codec,
    pixelFormat,
  };
}

export function validateInputMetadata(metadata: VideoMetadata): void {
  if (metadata.width > VIDEO_MAX_SIDE || metadata.height > VIDEO_MAX_SIDE || metadata.width * metadata.height > VIDEO_MAX_PIXELS) {
    throw new VideoCompressionError('video_dimensions_unsupported');
  }
}

