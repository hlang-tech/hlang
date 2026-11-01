/**
 * `useNodeContextMenu` — controller for the right-click node menu. Holds only
 * where the menu is open and which node it targets; the menu ITEMS (labels,
 * shortcuts, actions) are assembled by the consumer from clipboard/view-state
 * actions, so this hook carries no graph rules.
 */

import { useCallback, useMemo, useState } from 'react';
import type { NodeId, Point } from '@hlang-org/editor-core';

/** Where the menu is open and which node it targets. */
export interface NodeContextMenuState {
  /** Screen-space anchor (the click point). */
  readonly screen: Point;
  /** The node the menu acts on. */
  readonly nodeId: NodeId;
}

export interface NodeContextMenuController {
  readonly state: NodeContextMenuState | undefined;
  /** Open the menu for a node at a screen point. */
  openForNode(screen: Point, nodeId: NodeId): void;
  close(): void;
}

export function useNodeContextMenu(): NodeContextMenuController {
  const [state, setState] = useState<NodeContextMenuState | undefined>(undefined);

  const openForNode = useCallback((screen: Point, nodeId: NodeId): void => {
    setState({ screen, nodeId });
  }, []);

  const close = useCallback((): void => {
    setState(undefined);
  }, []);

  return useMemo(() => ({ state, openForNode, close }), [state, openForNode, close]);
}
