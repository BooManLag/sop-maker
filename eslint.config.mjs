import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // The separately deployed Cloud Function uses the Functions Framework CommonJS entry point.
  { files: ['infra/functions/**/*.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  { files: ['**/*.tsx'], rules: jsxA11y.flatConfigs.recommended.rules },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  globalIgnores(['.next/**', '.next-e2e/**', 'out/**', 'build/**', 'next-env.d.ts', 'docs/**']),
]);
