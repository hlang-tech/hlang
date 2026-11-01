/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useFollowScroll } from './useFollowScroll';
import type { FollowScroll } from './useFollowScroll';

afterEach(cleanup);

/** jsdom does no layout: give the list the scroll geometry a browser would. */
function geometry(element: HTMLElement, scrollHeight: number, clientHeight: number): void {
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight });
}

let latest: FollowScroll<HTMLOListElement> | undefined;

function List({ lines }: { readonly lines: number }): ReactElement {
  const follow = useFollowScroll<HTMLOListElement>();
  latest = follow;
  return (
    <ol ref={follow.ref} onScroll={follow.onScroll} data-testid="list">
      {Array.from({ length: lines }, (_, i) => (
        <li key={i}>{i}</li>
      ))}
    </ol>
  );
}

describe('useFollowScroll', () => {
  it('keeps the newest entry in view while following', () => {
    const { getByTestId, rerender } = render(<List lines={1} />);
    const list = getByTestId('list');
    geometry(list, 500, 100);
    rerender(<List lines={2} />);
    expect(list.scrollTop).toBe(500);
  });

  it('stops following when the reader scrolls back, and resumes at the bottom', () => {
    const { getByTestId, rerender } = render(<List lines={1} />);
    const list = getByTestId('list');
    geometry(list, 500, 100);
    rerender(<List lines={2} />);

    list.scrollTop = 200;
    act(() => {
      list.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    expect(latest?.follow).toBe(false);
    geometry(list, 600, 100);
    rerender(<List lines={3} />);
    expect(list.scrollTop).toBe(200);

    list.scrollTop = 500;
    act(() => {
      list.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    expect(latest?.follow).toBe(true);
  });

  it('follows again when asked to', () => {
    const { getByTestId, rerender } = render(<List lines={1} />);
    const list = getByTestId('list');
    geometry(list, 500, 100);
    list.scrollTop = 0;
    act(() => {
      list.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    expect(latest?.follow).toBe(false);
    act(() => {
      latest?.setFollow(true);
    });
    rerender(<List lines={2} />);
    expect(list.scrollTop).toBe(500);
  });
});
