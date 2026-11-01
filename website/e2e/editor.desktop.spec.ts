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
  // Both boxes are measured in one frame: the page may still be scrolling, so
  // two separate measurements could compare different moments.
  const inside = await sheet.evaluate(element => {
    const card = element.getBoundingClientRect();
    const canvas = element.closest('.hl-region-canvas')?.getBoundingClientRect();
    return (
      canvas !== undefined &&
      card.left >= canvas.left &&
      card.top >= canvas.top &&
      card.right <= canvas.right &&
      card.bottom <= canvas.bottom
    );
  });
  expect(inside).toBe(true);

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

test('on a desktop the editor edits: nodes drag, and the dock has its editing tools', async ({ page }) => {
  await page.goto('/#lumen');
  const editor = page.getByRole('application', { name: 'Lumen editor' });
  await editor.scrollIntoViewIfNeeded();
  await expect(editor.locator('.react-flow__node').first()).toBeVisible();
  await expect(editor.locator('.hl-readonly-badge')).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Undo' })).toBeVisible();

  const node = editor.locator('.react-flow__node').first();
  const before = await node.evaluate(element => element.getBoundingClientRect().left);
  const box = await node.boundingBox();
  expect(box).not.toBeNull();
  if (box !== null) {
    await page.mouse.move(box.x + 12, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 92, box.y + box.height / 2 + 40, { steps: 8 });
    await page.mouse.up();
  }
  await expect.poll(() => node.evaluate(element => element.getBoundingClientRect().left)).not.toBe(before);
});

