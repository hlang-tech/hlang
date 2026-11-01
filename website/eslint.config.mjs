// @ts-check
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

const baseDirectory = dirname(fileURLToPath(import.meta.url));

/** CJK ideographs, punctuation, kana, Hangul and full-width forms. Source is English only. */
const NON_ENGLISH_PATTERN =
  /[\u1100-\u11FF\u2E80-\u2FDF\u3000-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/u;

/** @type {import('eslint').ESLint.Plugin} */
const hlangPlugin = {
  meta: { name: 'hlang' },
  rules: {
    'english-only': {
      meta: {
        type: 'suggestion',
        docs: { description: 'Require English-only source code, comments and strings.' },
        schema: [],
        messages: { nonEnglish: 'Use English only in code, comments and strings.' },
      },
      create(context) {
        return {
          Program() {
            context.sourceCode.lines.forEach((text, index) => {
              const match = NON_ENGLISH_PATTERN.exec(text);
              if (match) {
                context.report({
                  loc: { start: { line: index + 1, column: match.index }, end: { line: index + 1, column: match.index + 1 } },
                  messageId: 'nonEnglish',
                });
              }
            });
          },
        };
      },
    },
  },
};

export default tseslint.config(
  { ignores: ['.next/**', '.next-dev/**', '.generated/**', 'node_modules/**', 'next-env.d.ts', '.taste-skill/**'] },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  ...nextCoreWebVitals,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: baseDirectory } },
    plugins: { hlang: hlangPlugin },
    rules: {
      'hlang/english-only': 'error',
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { 'no-console': 'off' },
  },
);
