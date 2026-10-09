// Gera o QR Code de mesa (SVG + PNG 1024 px) para a URL do cardápio.
// Uso: npm run qr:gerar -- [url]   (padrão: homologação)
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import QRCode from 'qrcode';

import { buildQrOptions, normalizeQrUrl, qrFileSlug } from '../lib/qr/options.ts';

const url = normalizeQrUrl(process.argv[2]);
const dir = path.resolve('docs', 'qr');
const base = path.join(dir, qrFileSlug(url));
await mkdir(dir, { recursive: true });
await writeFile(`${base}.svg`, await QRCode.toString(url, { ...buildQrOptions(), type: 'svg' }));
await QRCode.toFile(`${base}.png`, url, { ...buildQrOptions(), type: 'png' });
console.log(`QR gerado para ${url}\n  ${base}.svg\n  ${base}.png`);
