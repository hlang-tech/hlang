import { describe, expect, it } from 'vitest';
import { clampFooter, footerBounds, resizeByKey, toggleCollapsed } from './footer-size';

const bounds = { min: 40, max: 400 };

describe('footerBounds', () => {
  it('leaves the canvas its minimum height and never goes below the collapsed height', () => {
    expect(footerBounds({ available: 700, minHeight: 40, minCanvasHeight: 160 })).toEqual({ min: 40, max: 540 });
  });

  it('keeps max at least min when the editor is too short for both', () => {
    expect(footerBounds({ available: 150, minHeight: 40, minCanvasHeight: 160 })).toEqual({ min: 40, max: 40 });
  });
});

describe('clampFooter', () => {
  it('holds a height within the bounds', () => {
    expect(clampFooter(10, bounds)).toBe(40);
    expect(clampFooter(200, bounds)).toBe(200);
    expect(clampFooter(900, bounds)).toBe(400);
  });

  it('rounds to whole pixels', () => {
    expect(clampFooter(120.6, bounds)).toBe(121);
  });
});

describe('resizeByKey', () => {
  it('grows with ArrowUp and shrinks with ArrowDown, four times faster with Shift', () => {
    expect(resizeByKey(200, 'ArrowUp', false, bounds)).toBe(216);
    expect(resizeByKey(200, 'ArrowDown', false, bounds)).toBe(184);
    expect(resizeByKey(200, 'ArrowUp', true, bounds)).toBe(264);
    expect(resizeByKey(395, 'ArrowUp', false, bounds)).toBe(400);
  });

  it('goes to the ends with Home and End', () => {
    expect(resizeByKey(200, 'Home', false, bounds)).toBe(40);
    expect(resizeByKey(200, 'End', false, bounds)).toBe(400);
  });

  it('ignores other keys', () => {
    expect(resizeByKey(200, 'a', false, bounds)).toBeUndefined();
  });
});

describe('toggleCollapsed', () => {
  it('collapses an open footer and remembers its height', () => {
    expect(toggleCollapsed({ height: 220, restore: 180 }, bounds)).toEqual({ height: 40, restore: 220 });
  });

  it('restores a collapsed footer to the height it had', () => {
    expect(toggleCollapsed({ height: 40, restore: 220 }, bounds)).toEqual({ height: 220, restore: 220 });
  });

  it('restores within the current bounds', () => {
    expect(toggleCollapsed({ height: 40, restore: 900 }, bounds)).toEqual({ height: 400, restore: 900 });
  });
});
