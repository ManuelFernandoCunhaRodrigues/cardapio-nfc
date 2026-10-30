import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...coreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'next-env.d.ts',
      'src/lib/supabase/database.types.local.ts',
    ],
  },
];

export default eslintConfig;
