import type { VideoMetadata } from './metadata';
import type { VideoContainer } from './signature';

export type OutputDimensions = { width: number; height: number };

export function calculateOutputDimensions(width: number, height: number, rotation = 0): OutputDimensions {
  const swapsSides = rotation === 90 || rotation === 270;
  const displayWidth = swapsSides ? height : width;
  const displayHeight = swapsSides ? width : height;
  const portrait = displayHeight > displayWidth;
  const maxWidth = portrait ? 720 : displayWidth === displayHeight ? 720 : 1_280;
  const maxHeight = portrait ? 1_280 : 720;
  const scale = Math.min(1, maxWidth / displayWidth, maxHeight / displayHeight);
  return {
    width: Math.max(2, Math.floor((displayWidth * scale) / 2) * 2),
    height: Math.max(2, Math.floor((displayHeight * scale) / 2) * 2),
  };
}

export function buildProbeArguments(inputPath: string, container: VideoContainer): string[] {
  return ['-nostdin', '-protocol_whitelist', 'file', '-f', container.demuxer, '-i', inputPath];
}

export function buildEncodeArguments(options: {
  inputPath: string;
  outputPath: string;
  container: VideoContainer;
  metadata: VideoMetadata;
  fallback?: boolean;
  threads?: number;
}): { args: string[]; dimensions: OutputDimensions } {
  const dimensions = calculateOutputDimensions(options.metadata.width, options.metadata.height, options.metadata.rotation);
  const filters = [
    `scale=${dimensions.width}:${dimensions.height}:flags=lanczos`,
    'setsar=1',
  ];
  if (options.metadata.transfer) {
    filters.push(
      'zscale=t=linear:npl=100',
      'format=gbrpf32le',
      'zscale=p=bt709',
      'tonemap=tonemap=hable:desat=0',
      'zscale=t=bt709:m=bt709:r=tv',
    );
  }
  filters.push('format=yuv420p');

  const args = [
    '-nostdin',
    '-protocol_whitelist', 'file',
    '-f', options.container.demuxer,
    ...(options.threads !== undefined ? ['-threads', String(options.threads)] : []),
    '-i', options.inputPath,
    '-map', '0:v:0',
    '-an', '-sn', '-dn',
    '-t', '16',
    ...(options.threads !== undefined ? ['-filter_threads', String(options.threads)] : []),
    '-vf', filters.join(','),
    '-fpsmax', '30',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', options.fallback ? '28' : '24',
    '-maxrate', options.fallback ? '1000k' : '1500k',
    '-bufsize', options.fallback ? '1000k' : '2250k',
    '-profile:v', 'high',
    '-level:v', '3.1',
    '-pix_fmt', 'yuv420p',
    '-force_key_frames', 'expr:gte(t,n_forced*2)',
    '-movflags', '+faststart',
    '-map_metadata', '-1',
    '-map_chapters', '-1',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
  ];
  if (options.threads !== undefined) args.push('-threads', String(options.threads));
  args.push('-y', options.outputPath);
  return { args, dimensions };
}
