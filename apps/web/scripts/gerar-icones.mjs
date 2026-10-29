// Gera ícones do App Router a partir do logo da marca.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const source = path.resolve('public', 'brand', 'salgae-logo.webp');
const appDirectory = path.resolve('app');
// Branco, como o fundo do próprio logo, para não formar uma faixa no ícone.
const background = { r: 255, g: 255, b: 255, alpha: 1 };

async function icon(size) {
  return sharp(source).resize(size, size, { fit: 'contain', background }).png().toBuffer();
}

function icoFromPng(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size === 256 ? 0 : size, 6);
  header.writeUInt8(size === 256 ? 0 : size, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

await mkdir(appDirectory, { recursive: true });
const [appIcon, appleIcon, favicon] = await Promise.all([icon(512), icon(180), icon(64)]);
await Promise.all([
  writeFile(path.join(appDirectory, 'icon.png'), appIcon),
  writeFile(path.join(appDirectory, 'apple-icon.png'), appleIcon),
  writeFile(path.join(appDirectory, 'favicon.ico'), icoFromPng(favicon, 64)),
]);

console.log(`Ícones gerados em ${appDirectory}`);
