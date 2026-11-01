import { defineConfig } from 'vitest/config';

/**
 * Unit tests for @hlang-org/compiler.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.ts', 'src/**/*.d.ts'],
      reportsDirectory: 'coverage',
    },
  },
});
