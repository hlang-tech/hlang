/**
 * The single source of truth for which editor-core events force the React Flow
 * view to re-derive. Both sync hooks (`useHlangFlow`, `useGraphSync`) subscribe
 * to this exact set — kept here as ONE constant so they can never drift apart
 * (a kind added to one but not the other would silently diverge).
 */

import type { EditorEventKind } from '@hlang-org/editor-core';

export const RECONCILE_EVENTS: readonly EditorEventKind[] = [
  'nodeAdded',
  'nodeRemoved',
  'nodeChanged',
  'edgeAdded',
  'edgeRemoved',
  'viewStateChanged',
  'selectionChanged',
];
