import { afterEach, describe, expect, it, vi } from 'vitest';

import { VIDEO_MAX_BYTES, resolveVideoMimeType, validateVideoForUpload } from './client-video';

type FakeVideo = {
  preload: string;
  duration: number;
  onloadedmetadata: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  removeAttribute: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
};

function installVideo(event: 'none' | 'loadedmetadata' | 'error', duration = Number.NaN) {
  const removeAttribute = vi.fn();
  const load = vi.fn();
  const video: FakeVideo = {
    preload: '',
    duration,
    onloadedmetadata: null,
    onerror: null,
    src: '',
    removeAttribute,
    load,
  };
  Object.defineProperty(video, 'src', {
    set: () => {
      if (event === 'loadedmetadata') queueMicrotask(() => video.onloadedmetadata?.());
      if (event === 'error') queueMicrotask(() => video.onerror?.());
    },
  });
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:video', revokeObjectURL });
  vi.stubGlobal('document', { createElement: () => video });
  return { video, removeAttribute, load, revokeObjectURL };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('metadados de vídeo no navegador', () => {
  it('reconhece MOV pela extensão quando o navegador omite o MIME', () => {
    expect(resolveVideoMimeType({ name: 'video-do-iphone.MOV', type: '' })).toBe('video/quicktime');
  });

  it('rejeita arquivo que excede o limite antes de ler os metadados', async () => {
    const oversized = new File([new Uint8Array(1)], 'video.mp4', { type: 'video/mp4' });
    Object.defineProperty(oversized, 'size', { value: VIDEO_MAX_BYTES + 1 });

    await expect(validateVideoForUpload(oversized)).rejects.toThrow('50 MB');
  });

  it('abandona a leitura após 8 s, limpa o elemento e permite seguir sem duração', async () => {
    vi.useFakeTimers();
    const fake = installVideo('none');

    const pending = validateVideoForUpload(
      new File([new Uint8Array(1)], 'video.mp4', { type: 'video/mp4' }),
    );
    await vi.advanceTimersByTimeAsync(8_000);

    await expect(pending).resolves.toEqual({ duration: null, mimeType: 'video/mp4' });
    expect(fake.video.onloadedmetadata).toBeNull();
    expect(fake.video.onerror).toBeNull();
    expect(fake.removeAttribute).toHaveBeenCalledWith('src');
    expect(fake.load).toHaveBeenCalledOnce();
    expect(fake.revokeObjectURL).toHaveBeenCalledWith('blob:video');
  });

  it('rejeita loadedmetadata com 20 s e limpa o elemento', async () => {
    const fake = installVideo('loadedmetadata', 20);

    await expect(
      validateVideoForUpload(new File([new Uint8Array(1)], 'video.mp4', { type: 'video/mp4' })),
    ).rejects.toThrow('15 segundos');
    expect(fake.removeAttribute).toHaveBeenCalledWith('src');
    expect(fake.load).toHaveBeenCalledOnce();
  });

  it('trata error como duração desconhecida', async () => {
    const fake = installVideo('error');

    await expect(
      validateVideoForUpload(
        new File([new Uint8Array(1)], 'video.mov', { type: 'video/quicktime' }),
      ),
    ).resolves.toEqual({
      duration: null,
      mimeType: 'video/quicktime',
    });
    expect(fake.removeAttribute).toHaveBeenCalledWith('src');
    expect(fake.load).toHaveBeenCalledOnce();
  });
});
