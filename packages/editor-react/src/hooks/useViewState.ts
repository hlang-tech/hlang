/**
 * `useViewState` — reactive per-node view flags (hidden/locked) and actions over
 * the core's `IViewStateService`. Re-reads on the `viewStateChanged` event.
 *
 * Mirrors `useSelection`: the service exposes its internal (mutable) sets by
 * reference, so we drive re-renders off a version counter and re-read on each
 * advance rather than relying on reference identity.
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { EditorCore, NodeId } from '@hlang-org/editor-core';
import { SetHiddenCommand, SetLockedCommand } from '@hlang-org/editor-core';

export interface ViewStateState {
  readonly hiddenNodes: readonly NodeId[];
  readonly lockedNodes: readonly NodeId[];
  isHidden(id: NodeId): boolean;
  isLocked(id: NodeId): boolean;
  setHidden(id: NodeId, hidden: boolean): void;
  setLocked(id: NodeId, locked: boolean): void;
  toggleHidden(id: NodeId): void;
  toggleLocked(id: NodeId): void;
  clear(): void;
}

export function useViewState(core: EditorCore): ViewStateState {
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const disposable = core.events.on('viewStateChanged', () => {
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

  const isHidden = useCallback((id: NodeId): boolean => core.viewState.isHidden(id), [core]);
  const isLocked = useCallback((id: NodeId): boolean => core.viewState.isLocked(id), [core]);
  // Mutations run as commands so hide/lock participate in undo/redo.
  const setHidden = useCallback(
    (id: NodeId, hidden: boolean): void => {
      core.commands.execute(new SetHiddenCommand(id, hidden));
    },
    [core],
  );
  const setLocked = useCallback(
    (id: NodeId, locked: boolean): void => {
      core.commands.execute(new SetLockedCommand(id, locked));
    },
    [core],
  );
  const toggleHidden = useCallback(
    (id: NodeId): void => {
      core.commands.execute(new SetHiddenCommand(id, !core.viewState.isHidden(id)));
    },
    [core],
  );
  const toggleLocked = useCallback(
    (id: NodeId): void => {
      core.commands.execute(new SetLockedCommand(id, !core.viewState.isLocked(id)));
    },
    [core],
  );
  const clear = useCallback((): void => {
    core.viewState.clear();
  }, [core]);

  return useMemo<ViewStateState>(
    () => ({
      hiddenNodes: [...core.viewState.getHiddenNodes()],
      lockedNodes: [...core.viewState.getLockedNodes()],
      isHidden,
      isLocked,
      setHidden,
      setLocked,
      toggleHidden,
      toggleLocked,
      clear,
    }),
    // `version` invalidates the memo on each view-state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [core, version, isHidden, isLocked, setHidden, setLocked, toggleHidden, toggleLocked, clear],
  );
}
