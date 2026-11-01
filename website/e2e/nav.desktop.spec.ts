import { expect, test } from '@playwright/test';

test('the top bar shows every section and marks the current one', async ({ page }) => {
  await page.goto('/docs/compiler');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of ['Docs', 'Showcase', 'Brand', 'Changelog']) {
    await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await expect(nav.getByRole('link', { name: 'Docs', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'hlang on GitHub' })).toBeVisible();
});
