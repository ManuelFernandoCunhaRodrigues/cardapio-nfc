import { describe, expect, it } from 'vitest';

import { friendlyMediaError, MediaUserError } from './friendly-media-error';

describe('friendlyMediaError', () => {
  it('traduz os códigos conhecidos de foto e vídeo', () => {
    expect(friendlyMediaError(new Error('image_too_large'))).toBe(
      'A foto deve ter no máximo 15 MB.',
    );
    expect(friendlyMediaError(new Error('image_decode_failed'))).toContain('HEIC');
    expect(friendlyMediaError(new Error('upload_too_large'), 'video')).toContain('50 MB');
    expect(friendlyMediaError(new Error('video_timeout_gateway'), 'video')).toContain('demorou');
  });

  it('mostra a mensagem que já foi escrita para a tela', () => {
    expect(friendlyMediaError(new MediaUserError('Grave o vídeo em Full HD (1080p).'))).toBe(
      'Grave o vídeo em Full HD (1080p).',
    );
  });

  it('trata queda de conexão como problema de internet', () => {
    expect(friendlyMediaError(new TypeError('Failed to fetch'))).toContain('internet');
    expect(friendlyMediaError(new TypeError('Load failed'), 'video')).toContain('internet');
  });

  it('nunca mostra mensagem estrangeira ou técnica', () => {
    const decode = new DOMException('The source image could not be decoded.', 'InvalidStateError');
    expect(friendlyMediaError(decode)).toBe('Não foi possível preparar esta foto. Escolha outra.');
    expect(friendlyMediaError(new Error('Body exceeded 4 MB limit'), 'video')).toBe(
      'Não foi possível enviar o vídeo. Tente novamente.',
    );
    expect(friendlyMediaError(new TypeError('x is not a function'))).toBe(
      'Não foi possível preparar esta foto. Escolha outra.',
    );
    expect(friendlyMediaError('falha')).toBe('Não foi possível preparar esta foto. Escolha outra.');
  });
});
