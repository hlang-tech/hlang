import { defineConfig } from 'vitest/config';

/**
 * Unit tests for @hlang-org/editor-react.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.{ts,tsx}', 'test/**/*.spec.{ts,tsx}'],
    environment: 'jsdom',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.{ts,tsx}', 'src/**/*.d.ts'],
      reportsDirectory: 'coverage',
    },
  },
});
