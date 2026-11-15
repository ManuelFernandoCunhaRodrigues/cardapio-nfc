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
];
