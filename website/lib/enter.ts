import type { CSSProperties } from 'react';

type EnterStyle = CSSProperties & Record<'--enter-index', number>;

/** Stagger position for an `[data-enter]` element within its section. */
export function enter(index: number): EnterStyle {
  return { '--enter-index': index };
}
