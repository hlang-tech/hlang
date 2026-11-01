import { defineConfig } from 'vitest/config';

/**
 * Unit tests for @hlang-org/editor-ui.
 * editor-ui tests behavior, not pixels: pure logic in `*.spec.ts` (node) and
 * interaction hooks the browser harness cannot drive in `*.spec.tsx`, each
 * opted into jsdom with a `@vitest-environment jsdom` comment.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.{ts,tsx}', 'src/**/*.d.ts'],
      reportsDirectory: 'coverage',
    },
  },
});
