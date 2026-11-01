// Flat ESLint config (ESLint 9 + typescript-eslint 8 + react-hooks).
// Enforces the zero-`any`, industrial-grade bar for this package.
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = tseslint.config(
  {
    ignores: ['lib/**', 'coverage/**', 'node_modules/**'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: {
        // Both the library program and the test program, so `*.spec.ts` files
        // (pure-logic unit tests, node env) are type-aware-linted too.
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
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
    // React Flow node/edge components instantiate React Flow generics
    // (`NodeProps<HlangRFNode>`, `EdgeProps<HlangRFEdge>`) over types imported
    // from the `file:`-linked editor-react package. `tsc` resolves these to
    // their real shapes (verified), but typescript-eslint's separate program
    // cannot follow the cross-package generic and treats `data` as an error
    // type, producing FALSE `no-unsafe-*` positives. Scope the relaxation to
    // exactly these two boundary files — everything else keeps full strictness.
    files: ['src/nodes/HlangNode.tsx', 'src/edges/FlowEdge.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
