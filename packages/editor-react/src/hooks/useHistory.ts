/**
 * `useHistory` — reactive undo/redo state and actions.
 *
 * Subscribes to the `historyChanged` event so `canUndo` / `canRedo` stay
 * current, and exposes bound `undo` / `redo` callbacks.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { EditorCore } from '@hlang-org/editor-core';

export interface HistoryState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  undo(): void;
  redo(): void;
}

export function useHistory(core: EditorCore): HistoryState {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const disposable = core.events.on('historyChanged', onStoreChange);
      return (): void => {
        disposable.dispose();
      };
    },
    [core],
  );

  const canUndo = useSyncExternalStore(
    subscribe,
    () => core.history.canUndo(),
    () => core.history.canUndo(),
  );
  const canRedo = useSyncExternalStore(
    subscribe,
    () => core.history.canRedo(),
    () => core.history.canRedo(),
  );

  const undo = useCallback((): void => {
    core.history.undo();
  }, [core]);
  const redo = useCallback((): void => {
    core.history.redo();
  }, [core]);

  return { canUndo, canRedo, undo, redo };
}
