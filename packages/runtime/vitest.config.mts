import { defineConfig } from 'vitest/config';

/**
 * Unit tests for @hlang-org/runtime.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.ts', 'src/**/*.d.ts'],
      reportsDirectory: 'coverage',
      // The measured floor. Raise it as tests grow; never lower it.
      thresholds: { statements: 87, branches: 72, functions: 86, lines: 91 },
    },
  },
});
