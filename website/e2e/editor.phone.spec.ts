import { expect, test } from '@playwright/test';

test('on a phone the editor is view only, and its console fits', async ({ page }) => {
  await page.goto('/#lumen');
  const editor = page.getByRole('application', { name: 'Lumen editor' });
  await editor.scrollIntoViewIfNeeded();
  await expect(editor.locator('.react-flow__node').first()).toBeVisible();

  // View only: said in the toolbar, and nothing on the canvas edits.
  await expect(editor.locator('.hl-readonly-badge')).toBeVisible();
  await expect(editor.locator('.react-flow__node.draggable')).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Add node' })).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Zoom in' })).toBeVisible();

  // Every console action is inside the console's header.
  const head = editor.locator('.lumen-console .hl-panel-head');
  for (const name of ['Follow', 'Clear']) {
    await expect(head.getByRole('button', { name })).toBeVisible();
  }
  const fits = await head.evaluate(element => {
    const box = element.getBoundingClientRect();
    return [...element.querySelectorAll('button')].every(button => button.getBoundingClientRect().right <= box.right);
  });
  expect(fits).toBe(true);

  // Looking still works: tap a node, and the run log narrows to it.
  await head.getByRole('tab', { name: 'Run log' }).click();
  await editor.locator('.react-flow__node').first().tap();
  await expect(editor.locator('.react-flow__node.selected')).toHaveCount(1);
  const filter = editor.locator('.hl-runlog .hl-panel-action').first();
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
});
