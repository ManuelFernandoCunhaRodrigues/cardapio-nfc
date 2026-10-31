import tseslint from 'typescript-eslint';

// O core é puro: nada de framework, banco ou tela (decisão 8 do plano v3).
const frameworkImports = [
  'next',
  'next/*',
  'react',
  'react/*',
  'react-dom',
  'react-dom/*',
  'hono',
  'hono/*',
  '@supabase/*',
  'motion',
  'motion/*',
  '@salgae/web',
  '@salgae/web/*',
  '@salgae/api',
  '@salgae/api/*',
];

export default [
  ...tseslint.configs.recommended,
  { ignores: ['coverage/**', 'node_modules/**', 'src/database/database.types.local.ts'] },
  {
    rules: {
      'no-restricted-imports': ['error', { patterns: frameworkImports }],
    },
  },
];
