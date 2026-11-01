/**
 * @type {import('ts-jest').JestConfigWithTsJest}
 *
 * editor-ui does NOT test presentation/pixels (those are verified in the
 * example app end-to-end). This config covers two kinds of BEHAVIOR that
 * deserve deterministic unit tests per AGENTS.md:
 *   - pure, framework-free logic (e.g. the fuzzy matcher) in `*.spec.ts`,
 *     running in the fast `node` environment;
 *   - a small number of interaction hooks whose decision logic the browser
 *     E2E harness cannot drive (React Flow's connection gesture needs real
 *     pointer capture) — `*.spec.tsx`, opted into jsdom via a per-file
 *     `@jest-environment jsdom` docblock.
 * The default environment stays `node`; jsdom is used only where declared.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
};
