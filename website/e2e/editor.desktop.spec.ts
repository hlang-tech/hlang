import { expect, test } from '@playwright/test';

test('the shortcut sheet opens inside the editor, not over the page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.goto('/#lumen');
  const editor = page.getByRole('application', { name: 'Lumen editor' });
  await editor.scrollIntoViewIfNeeded();
  await editor.locator('.react-flow__node').first().click();
  await page.keyboard.press('?');

  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet).toBeVisible();
  const canvas = await editor.locator('.hl-region-canvas').boundingBox();
  const card = await sheet.boundingBox();
  expect(canvas).not.toBeNull();
  expect(card).not.toBeNull();
  if (canvas !== null && card !== null) {
    expect(card.x).toBeGreaterThanOrEqual(canvas.x);
    expect(card.y).toBeGreaterThanOrEqual(canvas.y);
    expect(card.x + card.width).toBeLessThanOrEqual(canvas.x + canvas.width);
    expect(card.y + card.height).toBeLessThanOrEqual(canvas.y + canvas.height);
  }

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  expect(errors).toEqual([]);
});
