import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  { ignores: ['coverage/**', 'node_modules/**', 'src/database/database.types.local.ts'] },
];
