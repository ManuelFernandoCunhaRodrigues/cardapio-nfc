import { describe, expect, it } from 'vitest';

import { parseFfmpegMetadata, validateInputMetadata } from './metadata';

const base = `
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'entrada.mov':
  Metadata:
    major_brand     : qt
  Duration: 00:00:15.50, start: 0.000000, bitrate: 12288 kb/s
  Stream #0:0: Video: hevc (Main 10), yuv420p10le(tv, bt2020nc/bt2020/arib-std-b67), 1080x1920, 29.97 fps, 29.97 tbr
    Side data:
      displaymatrix: rotation of -90.00 degrees
  Stream #0:1: Audio: aac, 48000 Hz, stereo
`;

describe('parser do texto de ffmpeg -i', () => {
  it('lê duração, streams, dimensões, fps, rotação e HLG', () => {
    expect(parseFfmpegMetadata(base)).toEqual({
      duration: 15.5,
      width: 1080,
      height: 1920,
      rotation: 270,
      fps: 29.97,
      transfer: 'arib-std-b67',
      videoStreams: 1,
      audioStreams: 1,
      codec: 'hevc',
      pixelFormat: 'yuv420p10le',
    });
  });

  it('aceita Duration N/A, detecta PQ e recusa ausência de vídeo', () => {
    const webm = `Duration: N/A\n  Stream #0:0: Video: vp9, yuv420p10le(tv, bt2020nc/bt2020/smpte2084), 1920x1080, 24 fps`;
    expect(parseFfmpegMetadata(webm)).toMatchObject({
      duration: null,
      transfer: 'smpte2084',
      codec: 'vp9',
    });
    expect(() => parseFfmpegMetadata('Duration: 00:00:01.00\n Stream #0:0: Audio: aac')).toThrow(
      'video_invalid',
    );
  });

  it('mantém a fronteira 15,5 legível e separa dimensão excessiva', () => {
    expect(parseFfmpegMetadata(base.replace('15.50', '15.51')).duration).toBe(15.51);
    const extreme = parseFfmpegMetadata(base.replace('1080x1920', '4096x2161'));
    expect(() => validateInputMetadata(extreme)).toThrow('video_dimensions_unsupported');
  });
});
