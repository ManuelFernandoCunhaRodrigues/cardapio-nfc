import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const input = fileURLToPath(new URL('../public/brand/salgae-logo.webp', import.meta.url));
const output = fileURLToPath(
  new URL('../public/brand/salgae-logo-recortada.webp', import.meta.url),
);

await sharp(input)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 92 })
  .toFile(output);
