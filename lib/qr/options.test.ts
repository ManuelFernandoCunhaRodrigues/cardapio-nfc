import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import jsQR from 'jsqr';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { buildQrOptions, DEFAULT_QR_URL, normalizeQrUrl, QR_DARK, QR_LIGHT, qrFileSlug } from './options';

async function decode(file: string, width: number) {
  const { data, info } = await sharp(file).resize(width, width).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

describe('opções do QR', () => {
  it('normaliza HTTPS, remove apenas a barra da raiz e preserva path/query', () => {
    expect(normalizeQrUrl(undefined)).toBe(DEFAULT_QR_URL);
    expect(normalizeQrUrl('https://salgae-homologacao.vercel.app/')).toBe(DEFAULT_QR_URL);
    expect(normalizeQrUrl('https://salgae-homologacao.vercel.app/cardapio?origem=qr')).toBe('https://salgae-homologacao.vercel.app/cardapio?origem=qr');
  });

  it('rejeita esquema sem HTTPS e credenciais', () => {
    expect(() => normalizeQrUrl('http://salgae-homologacao.vercel.app')).toThrow('HTTPS');
    expect(() => normalizeQrUrl('ftp://salgae-homologacao.vercel.app')).toThrow('HTTPS');
    expect(() => normalizeQrUrl('https://usuario:senha@salgae-homologacao.vercel.app')).toThrow('credenciais');
  });

  it('deriva slug estável e opções fixas', () => {
    expect(qrFileSlug('https://SALGAE-homologacao.vercel.app/cardapio')).toBe('salgae-homologacao-vercel-app');
    expect(buildQrOptions()).toEqual({ errorCorrectionLevel: 'M', margin: 4, width: 1024, color: { dark: QR_DARK, light: QR_LIGHT } });
    expect(buildQrOptions(256)).toEqual({ errorCorrectionLevel: 'M', margin: 4, width: 256, color: { dark: QR_DARK, light: QR_LIGHT } });
  });

  it('gera PNG de 1024 px legível no original e a 256 px', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'salgae-qr-'));
    const url = normalizeQrUrl(undefined);
    const file = path.join(directory, `${qrFileSlug(url)}.png`);
    try {
      await QRCode.toFile(file, url, { ...buildQrOptions(), type: 'png' });
      const metadata = await sharp(file).metadata();
      expect([metadata.width, metadata.height]).toEqual([1024, 1024]);
      await expect(decode(file, 1024)).resolves.toBe(url);
      await expect(decode(file, 256)).resolves.toBe(url);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
