import { defineConfig } from 'vitest/config';

/**
 * Unit tests for @hlang-org/editor-core.
 */
export default defineConfig({
  // The DI container injects through parameter decorators, as `experimentalDecorators`
  // in tsconfig.json declares; tests live outside that config's `include`.
  oxc: { decorator: { legacy: true } },
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.ts', 'src/**/*.d.ts'],
      reportsDirectory: 'coverage',
      // The measured floor. Raise it as tests grow; never lower it.
      thresholds: { statements: 94, branches: 81, functions: 93, lines: 94 },
    },
  },
});
