import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildProbeArguments } from './arguments';
import { compressVideoFile, removeCompressedVideo, type CompressedVideo } from './compress';
import { parseFfmpegMetadata } from './metadata';
import { hasFastStart } from './mp4';
import { runFfmpeg } from './process';

let directory: string;
const results: CompressedVideo[] = [];

async function execute(args: string[], timeoutMs = 60_000) {
  const result = await runFfmpeg(args, timeoutMs);
  if (result.timedOut || result.exitCode !== 0) throw new Error('O ffmpeg de teste falhou ou excedeu o tempo.');
  return result.stderr;
}

async function probe(path: string, demuxer: 'mov' | 'matroska' = 'mov') {
  const result = await runFfmpeg(buildProbeArguments(path, { kind: demuxer === 'mov' ? 'mp4' : 'webm', demuxer }), 10_000);
  if (result.timedOut) throw new Error('A leitura de metadados excedeu o tempo.');
  return { metadata: parseFfmpegMetadata(result.stderr), stderr: result.stderr };
}

function avcC(path: Uint8Array) {
  const offset = Buffer.from(path).indexOf(Buffer.from('avcC'));
  if (offset < 0 || offset + 7 >= path.length) throw new Error('avcC ausente');
  return { version: path[offset + 4], profileIdc: path[offset + 5], compatibility: path[offset + 6], levelIdc: path[offset + 7] };
}

async function compact(path: string, options: Partial<Parameters<typeof compressVideoFile>[0]> = {}) {
  const result = await compressVideoFile({ inputPath: path, workDir: directory, threads: 1, ...options });
  results.push(result);
  return result;
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'salgae-ffmpeg-test-'));
});

afterAll(async () => {
  await Promise.all(results.map((result) => removeCompressedVideo(result)));
  await rm(directory, { recursive: true, force: true });
});

// O Vitest executa os casos de um mesmo arquivo em série por padrão. Esta é a
// única suíte que invoca o ffmpeg, evitando concorrência entre encodes.
describe('compactação real com ffmpeg-static', () => {
  it('gera H.264 High 3.1/yuv420p, remove áudio e metadados, usa faststart e preserva qualidade', async () => {
    const input = join(directory, 'sdr-com-audio.mp4');
    await execute([
      '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30:duration=2',
      '-f', 'lavfi', '-i', 'sine=frequency=880:duration=2',
      '-metadata', 'creation_time=2020-01-02T03:04:05Z', '-metadata', 'location=-3.7-38.5/',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '10', '-pix_fmt', 'yuv420p', '-c:a', 'aac', input,
    ]);
    const inputInspection = await probe(input);
    expect(inputInspection.stderr).toContain('creation_time');
    expect(inputInspection.stderr).toContain('location');
    const output = await compact(input);
    const inspected = await probe(output.outputPath);
    expect(inspected.metadata).toMatchObject({
      codec: 'h264', pixelFormat: 'yuv420p', videoStreams: 1, audioStreams: 0,
      width: 640, height: 360, rotation: 0,
    });
    expect(inspected.stderr).toMatch(/Video: h264 \(High\)/i);
    expect(inspected.stderr).not.toContain('creation_time');
    expect(inspected.stderr).not.toContain('location');
    expect(avcC(await readFile(output.outputPath))).toMatchObject({ version: 1, profileIdc: 100 });
    expect(avcC(await readFile(output.outputPath)).levelIdc).toBeLessThanOrEqual(31);
    expect(hasFastStart(await readFile(output.outputPath))).toBe(true);
    expect(output.outputBytes).toBeLessThanOrEqual(4_194_304);

    const ssim = await execute(['-i', input, '-i', output.outputPath, '-lavfi', '[0:v][1:v]ssim', '-f', 'null', '-']);
    const score = Number(ssim.match(/All:([0-9.]+)/)?.[1]);
    expect(score).toBeGreaterThanOrEqual(0.95);
  }, 90_000);

  it('limita 60 fps a 30 sem alterar materialmente a duração', async () => {
    const input = join(directory, 'sessenta-fps.mp4');
    await execute(['-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=60:duration=1', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', input]);
    const output = await compact(input);
    const { metadata } = await probe(output.outputPath);
    expect(metadata.fps).not.toBeNull();
    expect(metadata.fps!).toBeLessThanOrEqual(30);
    expect(metadata.duration).toBeGreaterThanOrEqual(0.95);
    // O último frame a 30 fps pode arredondar a duração do contêiner em dois ticks.
    expect(metadata.duration).toBeLessThanOrEqual(1.1);
  }, 60_000);

  it.each([
    ['paisagem', 1920, 1080, 1280, 720],
    ['retrato', 1080, 1920, 720, 1280],
    ['pequeno', 640, 360, 640, 360],
  ])('dimensiona %s sem ampliar', async (name, width, height, expectedWidth, expectedHeight) => {
    const input = join(directory, `${name}.mp4`);
    await execute(['-y', '-f', 'lavfi', '-i', `testsrc2=size=${width}x${height}:rate=5`, '-frames:v', '2', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', input]);
    const output = await compact(input);
    expect(await probe(output.outputPath)).toMatchObject({ metadata: { width: expectedWidth, height: expectedHeight } });
  }, 60_000);

  it('aceita WebM 1080p por assinatura e demuxer forçado', async () => {
    const input = join(directory, 'entrada-1080p.webm');
    await execute(['-y', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=5', '-frames:v', '2', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', input]);
    const output = await compact(input);
    expect(await probe(output.outputPath)).toMatchObject({ metadata: { codec: 'h264', width: 1280, height: 720 } });
  }, 90_000);

  it('aplica display rotation aos pixels e remove a matriz da saída', async () => {
    const base = join(directory, 'assimetrico-base.mp4');
    const rotated = join(directory, 'assimetrico-rotacionado.mov');
    await execute([
      '-y', '-f', 'lavfi', '-i', 'testsrc2=size=120x80:rate=10:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', base,
    ]);
    await execute(['-y', '-display_rotation:v:0', '90', '-i', base, '-c', 'copy', rotated]);
    expect((await probe(rotated)).metadata.rotation).toBe(90);
    const output = await compact(rotated);
    const inspected = await probe(output.outputPath);
    expect(inspected.metadata).toMatchObject({ width: 80, height: 120, rotation: 0 });
    expect(inspected.stderr).not.toMatch(/displaymatrix|rotate\s*:/i);

    const frame = join(directory, 'rotacao.png');
    const reference = join(directory, 'rotacao-referencia.png');
    await execute(['-y', '-i', output.outputPath, '-frames:v', '1', frame]);
    await execute(['-y', '-i', base, '-vf', 'transpose=cclock', '-frames:v', '1', reference]);
    const [actual, expected] = await Promise.all([sharp(frame).removeAlpha().raw().toBuffer(), sharp(reference).removeAlpha().raw().toBuffer()]);
    const meanAbsoluteError = actual.reduce((sum, value, index) => sum + Math.abs(value - expected[index]), 0) / actual.length;
    expect(meanAbsoluteError).toBeLessThan(12);
  }, 60_000);

  it('converte HLG 10-bit para SDR BT.709 8-bit com zscale e tonemap', async () => {
    const input = join(directory, 'hdr-hlg.mov');
    await execute([
      '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24:duration=1',
      '-vf', 'format=yuv420p10le', '-c:v', 'libx265',
      '-x265-params', 'pools=1:frame-threads=1:log-level=error',
      '-color_primaries', 'bt2020', '-color_trc', 'arib-std-b67', '-colorspace', 'bt2020nc',
      '-tag:v', 'hvc1', input,
    ], 90_000);
    expect((await probe(input)).metadata.transfer).toBe('arib-std-b67');
    const output = await compact(input, { timeoutMs: 90_000 });
    const inspected = await probe(output.outputPath);
    expect(output.hdrConverted).toBe(true);
    expect(inspected.metadata.pixelFormat).toBe('yuv420p');
    expect(inspected.metadata.transfer).toBeNull();
    expect(inspected.stderr).toMatch(/bt709/i);
  }, 120_000);

  it('força uma recodificação e retorna erro tipado quando o teto injetado continua excedido', async () => {
    const input = join(directory, 'fallback.mp4');
    await execute(['-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', input]);
    const before = (await readdir(directory)).filter((name) => name.startsWith('salgae-video-'));
    await expect(compact(input, { maxOutputBytes: 1 })).rejects.toMatchObject({ code: 'video_output_too_large' });
    const after = (await readdir(directory)).filter((name) => name.startsWith('salgae-video-'));
    expect(after).toEqual(before);
  }, 60_000);

  it('mede a duração na saída quando o WebM de entrada não declara duração (17 s recusado, 2 s aceito)', async () => {
    const long = join(directory, 'live-long.webm');
    await execute(['-y', '-f', 'lavfi', '-i', 'color=black:size=32x32:rate=1:duration=17', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-live', '1', long]);
    expect((await probe(long, 'matroska')).metadata.duration).toBeNull();
    await expect(compact(long)).rejects.toMatchObject({ code: 'video_too_long' });

    const short = join(directory, 'live-short.webm');
    await execute(['-y', '-f', 'lavfi', '-i', 'color=black:size=32x32:rate=1:duration=2', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-live', '1', short]);
    expect((await probe(short, 'matroska')).metadata.duration).toBeNull();
    const output = await compact(short);
    expect(output.duration).toBeGreaterThanOrEqual(1.9);
    expect(output.duration).toBeLessThanOrEqual(2.1);
  }, 90_000);

  it('cumpre o orçamento de compactação para 1080p ruidoso em CI Linux', async () => {
    const input = join(directory, 'orcamento-1080p-ruidoso.mp4');
    await execute([
      '-y', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=30:duration=15',
      '-f', 'lavfi', '-i', 'sine=frequency=880:duration=15',
      '-filter:v', 'noise=alls=7:allf=t+u',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-b:v', '17M', '-maxrate', '20M', '-bufsize', '34M',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', input,
    ], 180_000);
    const output = await compact(input, { maxOutputBytes: 3_145_728, timeoutMs: 120_000 });
    console.info(`[video-orcamento] entrada=${output.inputBytes} saida=${output.outputBytes} ms=${output.elapsedMs} plataforma=${process.platform}/${process.arch}`);

    expect(output).toMatchObject({ width: 1280, height: 720 });
    expect(output.outputBytes).toBeLessThanOrEqual(3_145_728);
    expect(output.elapsedMs).toBeLessThan(120_000);
  }, 300_000);

  it('recusa arquivo corrompido, vídeo longo e respeita o orçamento de tempo', async () => {
    const corrupt = join(directory, 'corrompido.mp4');
    await import('node:fs/promises').then(({ writeFile }) => writeFile(corrupt, Buffer.from('arquivo falso')));
    await expect(compact(corrupt)).rejects.toMatchObject({ code: 'video_invalid' });

    const long = join(directory, 'longo.mp4');
    await execute(['-y', '-f', 'lavfi', '-i', 'color=black:size=32x32:rate=1:duration=16', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', long]);
    await expect(compact(long)).rejects.toMatchObject({ code: 'video_too_long' });

    const valid = join(directory, 'timeout.mp4');
    await execute(['-y', '-f', 'lavfi', '-i', 'color=black:size=320x180:rate=24:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', valid]);
    await expect(compact(valid, { timeoutMs: 1 })).rejects.toMatchObject({ code: 'video_timeout' });
  }, 60_000);
});
