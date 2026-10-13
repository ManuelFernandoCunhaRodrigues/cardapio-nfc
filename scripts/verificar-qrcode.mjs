// Decodifica o PNG do QR (tamanho original e reduzido a 256 px) e confere a URL.
// Uso: npm run qr:verificar -- [url]   (sai com código 1 se não bater)
import path from 'node:path';

import jsQR from 'jsqr';
import sharp from 'sharp';

import { normalizeQrUrl, qrFileSlug } from '../lib/qr/options.ts';

const url = normalizeQrUrl(process.argv[2]);
const file = path.resolve('docs', 'qr', `${qrFileSlug(url)}.png`);

async function decode(width) {
  const { data, info } = await sharp(file)
    .resize(width, width)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

let failed = false;
const metadata = await sharp(file).metadata();
const dimensionsOk = metadata.width === 1024 && metadata.height === 1024;
failed ||= !dimensionsOk;
console.log(
  `${dimensionsOk ? 'OK' : 'FALHOU'} dimensões: ${metadata.width ?? '?'}x${metadata.height ?? '?'} (esperado 1024x1024)`,
);
for (const width of [1024, 256]) {
  const text = await decode(width);
  const ok = text === url;
  failed ||= !ok;
  console.log(`${ok ? 'OK' : 'FALHOU'} ${width}px: ${text ?? '(não decodificado)'}`);
}
process.exit(failed ? 1 : 0);
