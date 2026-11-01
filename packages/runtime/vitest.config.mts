import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests for @hlang-org/runtime.
 */
export default defineConfig({
  test: {
    // Each package keeps its own module cache: Vitest's default is one directory
    // at the workspace root, which packages tested in parallel would share.
    fsModuleCachePath: join(import.meta.dirname, 'node_modules', '.vitest-cache'),
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.ts', 'src/**/*.d.ts'],
      reportsDirectory: 'coverage',
      // The measured floor. Raise it as tests grow; never lower it.
      thresholds: { statements: 98, branches: 93, functions: 95, lines: 99 },
    },
  },
});
