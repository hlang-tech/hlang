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

  // Scrolled under the sticky header, the sheet stays below it: the editor's
  // layers never stack above the page's. The site scrolls smoothly, so this
  // scroll is instant to measure the end state.
  await page.evaluate(() => {
    const top = document.querySelector('[role="dialog"]')?.getBoundingClientRect().top ?? 0;
    window.scrollBy({ top, behavior: 'instant' });
  });
  await expect.poll(() => sheet.evaluate(element => Math.round(element.getBoundingClientRect().top))).toBeLessThanOrEqual(1);
  const header = await page.locator('header').first().boundingBox();
  expect(header).not.toBeNull();
  if (header !== null) {
    const onTop = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('header') !== null,
      { x: header.x + header.width / 2, y: header.y + header.height / 2 },
    );
    expect(onTop).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  expect(errors).toEqual([]);
});
