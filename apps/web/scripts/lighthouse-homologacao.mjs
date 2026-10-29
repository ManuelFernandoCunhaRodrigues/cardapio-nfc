// Lighthouse mobile (4G simulado) nas rotas da homologação: 3 execuções por rota,
// mediana por métrica, comparação com os limiares do plano H1/H2 do Épico 5.
// Uso: node apps/web/scripts/lighthouse-homologacao.mjs [baseUrl]   (sai com código 1 se algo reprovar)
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] ?? 'https://salgae-homologacao.vercel.app').replace(/\/$/, '');
const routes = [
  '/',
  '/cardapio',
  '/produto/35fadaf3-79c3-444d-a50f-b0a604d709a1',
  '/info',
  '/admin/login',
];
const publicRoutes = new Set(routes.filter((route) => !route.startsWith('/admin')));
const RUNS = 3;
// `docs/` fica na raiz do monorepo, dois níveis acima de `apps/web`.
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const outDir = path.join(repoRoot, 'docs', 'testes', 'lighthouse');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// No Windows o npx precisa de shell; aspas protegem caminhos com espaço/acento.
const quote = (value) => (process.platform === 'win32' ? `"${value}"` : value);

async function runOnce(url, file) {
  execFileSync(
    npx,
    [
      '-y',
      'lighthouse@13.5.0',
      quote(url),
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--throttling-method=simulate',
      '--only-categories=performance,accessibility,best-practices',
      '--output=json',
      quote(`--output-path=${file}`),
      '--quiet',
      quote('--chrome-flags=--headless=new'),
    ],
    { stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' },
  );
  const report = JSON.parse(await readFile(file, 'utf8'));
  return {
    performance: Math.round(report.categories.performance.score * 100),
    accessibility: Math.round(report.categories.accessibility.score * 100),
    bestPractices: Math.round(report.categories['best-practices'].score * 100),
    lcp: Math.round(report.audits['largest-contentful-paint'].numericValue),
    cls: Number(report.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
    tbt: Math.round(report.audits['total-blocking-time'].numericValue),
  };
}

await mkdir(outDir, { recursive: true });
// Evidência sempre da execução atual: apaga relatórios brutos anteriores.
for (const name of await readdir(outDir))
  if (/-\d\.json$/.test(name)) await rm(path.join(outDir, name));
const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot })
  .toString()
  .trim();
// A própria pasta de evidências (execucao.log, relatórios) não conta como alteração de código.
const dirty =
  execFileSync(
    'git',
    ['status', '--porcelain', '--untracked-files=no', '--', '.', ':!docs/testes/lighthouse'],
    { cwd: repoRoot },
  )
    .toString()
    .trim() !== '';
const summary = [];
let failed = false;
for (const route of routes) {
  const runs = [];
  for (let i = 1; i <= RUNS; i += 1) {
    const slug =
      route === '/'
        ? 'home'
        : route
            .replace(/^\//, '')
            .replace(/[^a-z0-9]+/gi, '-')
            .slice(0, 40);
    runs.push(await runOnce(`${base}${route}`, path.join(outDir, `${slug}-${i}.json`)));
  }
  const result = Object.fromEntries(
    Object.keys(runs[0]).map((key) => [key, median(runs.map((run) => run[key]))]),
  );
  const failures = [];
  if (result.accessibility < 90) failures.push(`acessibilidade ${result.accessibility} < 90`);
  if (result.bestPractices < 90) failures.push(`boas práticas ${result.bestPractices} < 90`);
  if (publicRoutes.has(route)) {
    if (result.performance < 80) failures.push(`performance ${result.performance} < 80`);
    if (result.lcp > 3000) failures.push(`LCP ${result.lcp} ms > 3000`);
    if (result.cls > 0.1) failures.push(`CLS ${result.cls} > 0,1`);
    if (result.tbt > 300) failures.push(`TBT ${result.tbt} ms > 300`);
  }
  failed ||= failures.length > 0;
  summary.push({ route, ...result, status: failures.length ? 'FALHOU' : 'OK', failures });
  console.log(`${failures.length ? 'FALHOU' : 'OK'} ${route}`, result, failures.join('; '));
}
await writeFile(
  path.join(outDir, 'resumo.json'),
  `${JSON.stringify({ base, generatedAt: new Date().toISOString(), commit: dirty ? `${commit}+alterações locais` : commit, runs: RUNS, summary }, null, 2)}\n`,
);
process.exit(failed ? 1 : 0);
