/**
 * The size rules of the editor's resizable footer (its console): how tall it
 * may be, and how the keyboard and a double click change it. Pure, so the
 * pointer and keyboard handling in `useFooterResize` stays a thin layer.
 */

/** How far one arrow key press moves the footer edge, in pixels; Shift moves four times as far. */
export const FOOTER_KEY_STEP = 16;

export interface FooterBounds {
  readonly min: number;
  readonly max: number;
}

/**
 * The heights the footer may take in an editor with `available` pixels below
 * its toolbar: at least `minHeight` (its header alone, collapsed), and at most
 * what leaves the canvas `minCanvasHeight`.
 */
export function footerBounds(options: {
  readonly available: number;
  readonly minHeight: number;
  readonly minCanvasHeight: number;
}): FooterBounds {
  const { available, minHeight, minCanvasHeight } = options;
  return { min: minHeight, max: Math.max(minHeight, available - minCanvasHeight) };
}

/** `height` held within `bounds`, in whole pixels. */
export function clampFooter(height: number, bounds: FooterBounds): number {
  return Math.round(Math.min(bounds.max, Math.max(bounds.min, height)));
}

/** The height after pressing `key` on the footer edge, or `undefined` for a key that does nothing. */
export function resizeByKey(height: number, key: string, shift: boolean, bounds: FooterBounds): number | undefined {
  const step = FOOTER_KEY_STEP * (shift ? 4 : 1);
  switch (key) {
    case 'ArrowUp':
      return clampFooter(height + step, bounds);
    case 'ArrowDown':
      return clampFooter(height - step, bounds);
    case 'Home':
      return bounds.min;
    case 'End':
      return bounds.max;
    default:
      return undefined;
  }
}

/** The footer's height and the height to return to when it is opened again. */
export interface FooterSize {
  readonly height: number;
  readonly restore: number;
}

/** Collapses an open footer (remembering its height), or opens a collapsed one to that height. */
export function toggleCollapsed(size: FooterSize, bounds: FooterBounds): FooterSize {
  if (size.height > bounds.min) {
    return { height: bounds.min, restore: size.height };
  }
  return { height: clampFooter(size.restore, bounds), restore: size.restore };
}
