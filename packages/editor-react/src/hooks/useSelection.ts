/**
 * `useSelection` — reactive selection state and actions over the core's
 * `ISelectionService`. Re-reads on the `selectionChanged` event.
 *
 * The selection service exposes its internal (mutable) sets by reference, so a
 * mutation does not change their identity. We therefore drive re-renders off a
 * version counter and re-read the sets whenever it advances, rather than
 * relying on reference identity in `useSyncExternalStore`.
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { EditorCore, NodeId, EdgeId, SelectionMode } from '@hlang-org/editor-core';

export interface SelectionState {
  readonly selectedNodes: readonly NodeId[];
  readonly selectedEdges: readonly EdgeId[];
  isSelected(id: NodeId | EdgeId): boolean;
  selectNodes(ids: readonly NodeId[], mode: SelectionMode): void;
  selectEdges(ids: readonly EdgeId[], mode: SelectionMode): void;
  clear(): void;
}

export function useSelection(core: EditorCore): SelectionState {
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const disposable = core.events.on('selectionChanged', () => {
        versionRef.current += 1;
        onStoreChange();
      });
      return (): void => {
        disposable.dispose();
      };
    },
    [core],
  );

  const getSnapshot = useCallback((): number => versionRef.current, []);
  const version = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isSelected = useCallback(
    (id: NodeId | EdgeId): boolean => core.selection.isSelected(id),
    [core],
  );
  const selectNodes = useCallback(
    (ids: readonly NodeId[], mode: SelectionMode): void => {
      core.selection.selectNodes(ids, mode);
    },
    [core],
  );
  const selectEdges = useCallback(
    (ids: readonly EdgeId[], mode: SelectionMode): void => {
      core.selection.selectEdges(ids, mode);
    },
    [core],
  );
  const clear = useCallback((): void => {
    core.selection.clear();
  }, [core]);

  return useMemo<SelectionState>(
    () => ({
      selectedNodes: [...core.selection.getSelectedNodes()],
      selectedEdges: [...core.selection.getSelectedEdges()],
      isSelected,
      selectNodes,
      selectEdges,
      clear,
    }),
    // `version` invalidates the memo on each selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [core, version, isSelected, selectNodes, selectEdges, clear],
  );
}
