import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks of the built site: behavior and layout that unit tests cannot
 * see (the live graph runs, the editor runs, the menu works, nothing overflows).
 * Runs against `next start` on the production build, at a desktop and a phone
 * size. Run `pnpm build` first.
 */
const PORT = Number(process.env['E2E_PORT'] ?? 5197);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  retries: process.env['CI'] === undefined ? 0 : 1,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['github']],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'retain-on-failure',
  },
  projects: [
    // `*.phone.spec.ts` and `*.desktop.spec.ts` cover what exists at one size only.
    {
      name: 'desktop',
      testIgnore: '**/*.phone.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'phone', testIgnore: '**/*.desktop.spec.ts', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `pnpm exec next start -p ${String(PORT)}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
