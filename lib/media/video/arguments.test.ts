import { describe, expect, it } from 'vitest';

import { buildEncodeArguments, buildProbeArguments, calculateOutputDimensions } from './arguments';
import type { VideoMetadata } from './metadata';

const metadata: VideoMetadata = {
  duration: 15,
  width: 1920,
  height: 1080,
  rotation: 0,
  fps: 60,
  transfer: null,
  videoStreams: 1,
  audioStreams: 1,
  codec: 'h264',
  pixelFormat: 'yuv420p',
};

describe('argumentos seguros do ffmpeg', () => {
  it('posiciona as opções de entrada antes do -i e usa argv sem shell', () => {
    const input = 'C:\\pasta com espaço\\; perigoso.mp4';
    const probe = buildProbeArguments(input, { kind: 'mp4', demuxer: 'mov' });
    expect(probe).toEqual(['-nostdin', '-protocol_whitelist', 'file', '-f', 'mov', '-i', input]);
    expect(probe.indexOf('-protocol_whitelist')).toBeLessThan(probe.indexOf('-i'));

    const { args } = buildEncodeArguments({ inputPath: input, outputPath: 'saida.mp4', container: { kind: 'mp4', demuxer: 'mov' }, metadata, threads: 1 });
    expect(args.indexOf('-protocol_whitelist')).toBeLessThan(args.indexOf('-i'));
    expect(args.indexOf('-threads')).toBeLessThan(args.indexOf('-i'));
    expect(args.filter((value) => value === '-threads')).toHaveLength(2);
    expect(args.lastIndexOf('-threads')).toBeGreaterThan(args.indexOf('-c:v'));
    expect(args.indexOf('-filter_threads')).toBeLessThan(args.indexOf('-vf'));
    expect(args).toEqual(expect.arrayContaining([
      '-nostdin', '-map', '0:v:0', '-an', '-sn', '-dn', '-t', '16', '-fpsmax', '30',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-maxrate', '1500k',
      '-bufsize', '2250k', '-profile:v', 'high', '-level:v', '3.1', '-pix_fmt', 'yuv420p',
      '-force_key_frames', 'expr:gte(t,n_forced*2)', '-movflags', '+faststart',
      '-map_metadata', '-1', '-map_chapters', '-1', '-filter_threads', '1', '-threads', '1',
    ]));
    expect(args.filter((value) => value === '-i')).toHaveLength(1);
    expect(args).not.toContain('http');
    expect(args).not.toContain('concat');
    const automatic = buildEncodeArguments({ inputPath: input, outputPath: 'saida.mp4', container: { kind: 'mp4', demuxer: 'mov' }, metadata }).args;
    expect(automatic).not.toContain('-threads');
    expect(automatic).not.toContain('-filter_threads');
  });

  it('liga tone mapping somente para HLG/PQ e aplica a política de fallback', () => {
    const hdr = buildEncodeArguments({
      inputPath: 'entrada.mov', outputPath: 'saida.mp4', container: { kind: 'mp4', demuxer: 'mov' },
      metadata: { ...metadata, transfer: 'arib-std-b67' }, fallback: true,
    }).args;
    const filter = hdr[hdr.indexOf('-vf') + 1];
    expect(filter).toContain('zscale=t=linear:npl=100');
    expect(filter).toContain('tonemap=tonemap=hable:desat=0');
    expect(filter).toContain('format=yuv420p');
    expect(hdr.slice(hdr.indexOf('-crf'), hdr.indexOf('-crf') + 6)).toEqual(['-crf', '28', '-maxrate', '1000k', '-bufsize', '1000k']);
    const sdr = buildEncodeArguments({ inputPath: 'a', outputPath: 'b', container: { kind: 'webm', demuxer: 'matroska' }, metadata }).args;
    expect(sdr[sdr.indexOf('-vf') + 1]).not.toContain('tonemap');
  });
});

describe('dimensões publicadas', () => {
  it.each([
    [3840, 2160, 0, 1280, 720],
    [2160, 3840, 0, 720, 1280],
    [1080, 1080, 0, 720, 720],
    [640, 360, 0, 640, 360],
    [1921, 1081, 0, 1278, 720],
    [1920, 1080, 90, 720, 1280],
  ])('%ix%i com rotação %i vira %ix%i', (width, height, rotation, expectedWidth, expectedHeight) => {
    expect(calculateOutputDimensions(width, height, rotation)).toEqual({ width: expectedWidth, height: expectedHeight });
  });
});
