/**
 * `useFollowScroll` — a scrolling list that stays on its newest entry, as a
 * terminal does. While following, every render scrolls it to the bottom. When
 * the reader scrolls back to read, following stops so the view holds still;
 * scrolling back to the bottom (or `setFollow(true)`) resumes it.
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject, UIEvent } from 'react';

/** Within this many pixels of the bottom, the list counts as at the bottom. */
export const FOLLOW_SLACK_PX = 24;

export interface FollowScroll<T extends HTMLElement> {
  /** Attach to the scrolling element. */
  readonly ref: RefObject<T | null>;
  /** Attach as the scrolling element's `onScroll`. */
  readonly onScroll: (event: UIEvent<T>) => void;
  readonly follow: boolean;
  readonly setFollow: (follow: boolean) => void;
}

export function useFollowScroll<T extends HTMLElement>(): FollowScroll<T> {
  const ref = useRef<T>(null);
  const [follow, setFollow] = useState(true);

  // After every render: new entries may have arrived.
  useLayoutEffect(() => {
    const element = ref.current;
    if (follow && element !== null) {
      element.scrollTop = element.scrollHeight;
    }
  });

  const onScroll = useCallback((event: UIEvent<T>): void => {
    const element = event.currentTarget;
    setFollow(element.scrollHeight - element.scrollTop - element.clientHeight <= FOLLOW_SLACK_PX);
  }, []);

  return { ref, onScroll, follow, setFollow };
}
