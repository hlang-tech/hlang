import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function noHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
}

test('the home page renders without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'hlang' })).toBeVisible();
  await noHorizontalOverflow(page);
});

test('the live graph runs the program in the browser', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Text to send').fill('hlang');
  await page.getByRole('radio', { name: 'Reverse' }).click();
  await expect(page.locator('output').first()).toHaveText('gnalh');
  await expect(page.getByText('text.out → transform.in').first()).toBeVisible();
});

test('the Lumen editor runs its flow', async ({ page }) => {
  await page.goto('/#lumen');
  const editor = page.getByRole('application', { name: 'Lumen editor' });
  await editor.scrollIntoViewIfNeeded();
  await expect(editor.locator('.react-flow__node').first()).toBeVisible();
  await expect(editor.locator('.hl-output-line').first()).toBeVisible({ timeout: 10_000 });
});

test('the theme toggle switches between light and dark', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const wasDark = ((await html.getAttribute('class')) ?? '').includes('dark');
  await page.getByRole('button', { name: /Switch to the (light|dark) theme/ }).click();
  await expect(html).toHaveClass(wasDark ? /\blight\b/ : /\bdark\b/);
});

test('the docs render code frames and images from source', async ({ page }) => {
  await page.goto('/docs/getting-started');
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
  expect(await page.locator('.code-frame').count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.code-frame-copy').first()).toBeVisible();
  await noHorizontalOverflow(page);
  await page.goto('/brand');
  const broken = await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length);
  expect(broken).toBe(0);
});

test('the API reference is generated for every package', async ({ page }) => {
  await page.goto('/docs/api');
  await expect(page.getByRole('link', { name: /@hlang-org\/runtime/ })).toBeVisible();
  await page.goto('/docs/api/ir');
  await expect(page.getByRole('heading', { name: 'planGraph()' })).toBeVisible();
});

test('an unknown page shows the 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This port has no connection.' })).toBeVisible();
});
