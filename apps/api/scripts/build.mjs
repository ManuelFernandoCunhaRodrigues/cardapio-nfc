import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { build } from 'esbuild';

const apiRoot = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const externalPackages = Object.keys(packageJson.dependencies)
  .filter((name) => name !== '@salgae/core')
  .flatMap((name) => [name, `${name}/*`]);

await build({
  entryPoints: {
    index: join(apiRoot, 'src/index.ts'),
    server: join(apiRoot, 'src/server.ts'),
  },
  outdir: join(apiRoot, 'dist'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: externalPackages,
});
