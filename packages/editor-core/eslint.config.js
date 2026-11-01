// Flat ESLint config (ESLint 9 + typescript-eslint 8).
// Enforces the zero-`any`, industrial-grade bar for this package.
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['lib/**', 'coverage/**', 'node_modules/**'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // No type assertions: model the type, or narrow it with a guard.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      // NodeId / EdgeId are distinct nominal domain aliases that happen to be
      // `string`; unions of them are intentional and semantically meaningful.
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
