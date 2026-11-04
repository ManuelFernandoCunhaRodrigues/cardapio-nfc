import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

// Fronteiras do frontend: o banco fica atrás da API (o web só usa o Supabase para o login),
// o processamento de mídia pesada é da API e o Motion entra só pelo `m` (LazyMotion strict).
const supabaseImports = ['@supabase/*'];
const mediaProcessingImports = ['sharp', 'ffmpeg-static'];
const backendImports = ['hono', 'hono/*', '@salgae/api', '@salgae/api/*'];
const motionPaths = [
  {
    name: 'motion',
    message: 'Importe de motion/react ou motion/react-m (o pacote raiz traz tudo).',
  },
  {
    name: 'motion/react',
    importNames: ['motion'],
    message: 'Use `import * as m from "motion/react-m"`: o provider usa LazyMotion strict.',
  },
];

function restrictImports(patterns) {
  return { 'no-restricted-imports': ['error', { patterns, paths: motionPaths }] };
}

const eslintConfig = [
  ...coreWebVitals,
  ...nextTypeScript,
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: restrictImports([...supabaseImports, ...mediaProcessingImports, ...backendImports]),
  },
  {
    // Sessão do login (@supabase/ssr) e o token que vai para a API.
    files: ['src/lib/supabase/**', 'src/lib/auth/**'],
    rules: restrictImports([...mediaProcessingImports, ...backendImports]),
  },
  {
    // Ponto único que adapta a API Hono para o servidor do Next.
    files: ['src/lib/api/embedded-api.ts'],
    rules: restrictImports([...supabaseImports, ...mediaProcessingImports]),
  },
  {
    // O vídeo fica no Next (ver docs/planejamento/dois-projetos-por-ambiente.md) e os testes
    // geram imagens de verdade.
    files: ['src/features/media/server/video/**', 'src/**/*.test.ts'],
    rules: restrictImports([...supabaseImports, ...backendImports]),
  },
];

export default eslintConfig;
