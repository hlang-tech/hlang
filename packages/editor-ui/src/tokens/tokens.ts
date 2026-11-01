/**
 * Typed accessors for the design tokens. This module only NAMES the CSS custom
 * properties declared in `tokens.css` — it never duplicates their values, so
 * there is a single source of truth. Components reference tokens through here
 * (e.g. `KIND_TOKEN[node.kind]`) instead of hardcoding hex values.
 */

import type { NodeKind } from '@hlang-org/editor-core';

/** The full set of token custom-property names (without the leading `--`). */
export const TOKEN_NAMES = [
  'hl-void',
  'hl-void-2',
  'hl-surface',
  'hl-surface-2',
  'hl-line',
  'hl-line-strong',
  'hl-silver',
  'hl-silver-hi',
  'hl-silver-lo',
  'hl-glass',
  'hl-glass-2',
  'hl-glass-blur',
  'hl-glass-sat',
  'hl-glass-edge',
  'hl-glass-edge-hi',
  'hl-spark',
  'hl-r',
  'hl-t',
  'hl-w',
  'hl-error',
  'hl-warning',
  'hl-ink',
  'hl-ink-2',
  'hl-ink-3',
  'hl-font-ui',
  'hl-font-mono',
  'hl-r-sm',
  'hl-r-md',
  'hl-r-lg',
  'hl-r-pill',
  'hl-shadow-node',
  'hl-shadow-glass',
  'hl-glow-silver',
  'hl-ease',
  'hl-activity',
  'hl-cost',
] as const;

/** A token name (without `--`), e.g. `'hl-silver'`. */
export type TokenName = (typeof TOKEN_NAMES)[number];

/** `var(--<name>)` reference string for a token. */
export function tokenVar(name: TokenName): string {
  return `var(--${name})`;
}

/** Maps a node kind to its color-temperature token reference. */
export const KIND_TOKEN: Record<NodeKind, string> = {
  R: 'var(--hl-r)',
  T: 'var(--hl-t)',
  W: 'var(--hl-w)',
};

/** Human-readable role label per node kind (used in node headers). */
export const KIND_ROLE: Record<NodeKind, string> = {
  R: 'source',
  T: 'transform',
  W: 'sink',
};
