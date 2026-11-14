import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import next from '@next/eslint-plugin-next';
import globals from 'globals';
export default defineConfig([
  globalIgnores([
    '.next/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, '@next/next': next },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
]);
