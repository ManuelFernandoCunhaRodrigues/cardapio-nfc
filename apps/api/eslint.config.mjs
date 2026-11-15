import tseslint from 'typescript-eslint';

const forbiddenFrontendImports = ['next', 'next/*', 'react', 'react/*'];
const forbiddenRepositoryImports = ['**/*.repository', '**/*.repository.*'];

export default [
  { ignores: ['coverage/**', 'dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-restricted-imports': ['error', { patterns: forbiddenFrontendImports }],
    },
  },
  {
    files: ['**/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...forbiddenFrontendImports, ...forbiddenRepositoryImports, '@supabase/*'] },
      ],
    },
  },
  {
    files: ['**/*.service.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...forbiddenFrontendImports,
            ...forbiddenRepositoryImports,
            'hono',
            'hono/*',
            '@supabase/*',
          ],
        },
      ],
    },
  },
  {
    // A regra "quem é admin" fica no core e a leitura do perfil no repositório; o middleware só orquestra.
    files: ['src/shared/auth/**/*.ts'],
    ignores: ['**/*.repository.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...forbiddenFrontendImports, '@supabase/*'] },
      ],
    },
  },
];
