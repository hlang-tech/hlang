import { expect, test } from '@playwright/test';

test('the menu opens, navigates and closes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const panel = page.locator('div[id]').filter({ has: page.getByRole('link', { name: 'Changelog' }) }).last();
  await expect(panel).toBeVisible();
  await panel.getByRole('link', { name: 'Docs' }).click();
  await expect(page).toHaveURL(/\/docs\/introduction$/);
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
});

test('Escape closes the menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
});
