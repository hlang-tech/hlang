/**
 * `useFooterResize` — the state of a footer whose top edge the user drags, or
 * moves with the keyboard, to make it taller or shorter. It takes only what it
 * reads (a pointer's `clientY`, a key), so `FooterResizer` adapts the browser's
 * events to it and the behavior is testable without a browser.
 *
 * The height the user asked for is kept apart from the height shown: when the
 * editor gets shorter the footer shrinks to fit, and when it grows back the
 * footer returns to the asked-for height.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { clampFooter, footerBounds, resizeByKey, toggleCollapsed } from './footer-size';
import type { FooterBounds } from './footer-size';

/** How a resizable footer behaves. */
export interface FooterResizeOptions {
  /** Its height when the editor opens, in pixels. */
  readonly defaultHeight: number;
  /** Its height when collapsed: its own header, so it can always be grabbed and opened again. */
  readonly minHeight: number;
  /** The height the canvas always keeps. Default `DEFAULT_MIN_CANVAS_HEIGHT`. */
  readonly minCanvasHeight?: number;
}

/** The canvas height a footer never takes away, unless a host sets another. */
export const DEFAULT_MIN_CANVAS_HEIGHT = 160;

export interface FooterResize {
  /** The height to render. */
  readonly height: number;
  readonly bounds: FooterBounds;
  readonly dragging: boolean;
  /** Tells the hook how many pixels the toolbar leaves for the canvas and the footer. */
  readonly measure: (available: number) => void;
  readonly startDrag: (clientY: number) => void;
  readonly drag: (clientY: number) => void;
  readonly endDrag: () => void;
  /** Applies a key pressed on the edge; returns whether the key resized the footer. */
  readonly keyDown: (key: string, shift: boolean) => boolean;
  /** Collapses the footer, or opens it again to the height it had. */
  readonly toggle: () => void;
}

export function useFooterResize(options: FooterResizeOptions): FooterResize {
  const { defaultHeight, minHeight } = options;
  const minCanvasHeight = options.minCanvasHeight ?? DEFAULT_MIN_CANVAS_HEIGHT;
  // Unknown until measured (e.g. while rendering on a server): the default fits.
  const [available, setAvailable] = useState<number | null>(null);
  const [preferred, setPreferred] = useState(defaultHeight);
  const [restore, setRestore] = useState(defaultHeight);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ readonly clientY: number; readonly height: number } | null>(null);

  const bounds = useMemo<FooterBounds>(
    () =>
      available === null
        ? { min: minHeight, max: Math.max(minHeight, defaultHeight) }
        : footerBounds({ available, minHeight, minCanvasHeight }),
    [available, minHeight, minCanvasHeight, defaultHeight],
  );
  const height = clampFooter(preferred, bounds);

  /** Sets the height the user asked for; an open height is also the one to reopen to. */
  const choose = useCallback(
    (next: number): void => {
      setPreferred(next);
      if (next > bounds.min) {
        setRestore(next);
      }
    },
    [bounds.min],
  );

  const measure = useCallback((next: number): void => {
    setAvailable(next);
  }, []);

  const startDrag = useCallback(
    (clientY: number): void => {
      dragStart.current = { clientY, height };
      setDragging(true);
    },
    [height],
  );

  const drag = useCallback(
    (clientY: number): void => {
      const start = dragStart.current;
      if (start === null) {
        return;
      }
      choose(clampFooter(start.height + (start.clientY - clientY), bounds));
    },
    [bounds, choose],
  );

  const endDrag = useCallback((): void => {
    dragStart.current = null;
    setDragging(false);
  }, []);

  const toggle = useCallback((): void => {
    const next = toggleCollapsed({ height, restore }, bounds);
    setPreferred(next.height);
    setRestore(next.restore);
  }, [height, restore, bounds]);

  const keyDown = useCallback(
    (key: string, shift: boolean): boolean => {
      if (key === 'Enter') {
        toggle();
        return true;
      }
      const next = resizeByKey(height, key, shift, bounds);
      if (next === undefined) {
        return false;
      }
      choose(next);
      return true;
    },
    [height, bounds, choose, toggle],
  );

  return { height, bounds, dragging, measure, startDrag, drag, endDrag, keyDown, toggle };
}
