/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useFooterResize } from './useFooterResize';

afterEach(cleanup);

const OPTIONS = { defaultHeight: 180, minHeight: 40, minCanvasHeight: 160 };

/** The hook in an editor with `available` pixels below its toolbar. */
function setup(available = 700) {
  const hook = renderHook(() => useFooterResize(OPTIONS));
  act(() => {
    hook.result.current.measure(available);
  });
  return hook;
}

describe('useFooterResize', () => {
  it('starts at the default height within the bounds of the editor', () => {
    const { result } = setup();
    expect(result.current.height).toBe(180);
    expect(result.current.bounds).toEqual({ min: 40, max: 540 });
  });

  it('follows a drag of its top edge: up grows it, down shrinks it, within the bounds', () => {
    const { result } = setup();
    act(() => {
      result.current.startDrag(500);
    });
    expect(result.current.dragging).toBe(true);
    act(() => {
      result.current.drag(450);
    });
    expect(result.current.height).toBe(230);
    act(() => {
      result.current.drag(-1000);
    });
    expect(result.current.height).toBe(540);
    act(() => {
      result.current.drag(2000);
    });
    expect(result.current.height).toBe(40);
    act(() => {
      result.current.endDrag();
    });
    expect(result.current.dragging).toBe(false);
  });

  it('ignores pointer moves when no drag is in progress', () => {
    const { result } = setup();
    act(() => {
      result.current.drag(100);
    });
    expect(result.current.height).toBe(180);
  });

  it('resizes with the keyboard and reports which keys it used', () => {
    const { result } = setup();
    let handled = false;
    act(() => {
      handled = result.current.keyDown('ArrowUp', false);
    });
    expect([handled, result.current.height]).toEqual([true, 196]);
    act(() => {
      handled = result.current.keyDown('Tab', false);
    });
    expect([handled, result.current.height]).toEqual([false, 196]);
    act(() => {
      handled = result.current.keyDown('Enter', false);
    });
    expect([handled, result.current.height]).toEqual([true, 40]);
  });

  it('collapses and reopens to the height it had', () => {
    const { result } = setup();
    act(() => {
      result.current.startDrag(500);
      result.current.drag(400);
      result.current.endDrag();
    });
    expect(result.current.height).toBe(280);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.height).toBe(40);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.height).toBe(280);
  });

  it('shrinks to fit when the editor gets shorter', () => {
    const { result } = setup();
    act(() => {
      result.current.keyDown('End', false);
    });
    expect(result.current.height).toBe(540);
    act(() => {
      result.current.measure(400);
    });
    expect(result.current.bounds).toEqual({ min: 40, max: 240 });
    expect(result.current.height).toBe(240);
  });
});
