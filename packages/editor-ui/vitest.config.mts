import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests for @hlang-org/editor-ui.
 * editor-ui tests behavior, not pixels: pure logic in `*.spec.ts` (node) and
 * interaction hooks the browser harness cannot drive in `*.spec.tsx`, each
 * opted into jsdom with a `@vitest-environment jsdom` comment.
 */
export default defineConfig({
  test: {
    // Each package keeps its own module cache: Vitest's default is one directory
    // at the workspace root, which packages tested in parallel would share.
    fsModuleCachePath: join(import.meta.dirname, 'node_modules', '.vitest-cache'),
    include: ['src/**/*.spec.{ts,tsx}'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      // Presentation (`*.tsx`) is verified in the browser, not here; coverage
      // measures the logic modules.
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.ts', 'src/**/*.d.ts'],
      reportsDirectory: 'coverage',
      // The measured floor. Raise it as tests grow; never lower it.
      thresholds: { statements: 88, branches: 81, functions: 90, lines: 88 },
    },
  },
});
