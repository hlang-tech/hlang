/**
 * `useReadOnly` — whether the editor is read-only, kept current as the host
 * switches it (see editor-core's `EditorModeService`).
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { EditorCore } from '@hlang-org/editor-core';

export function useReadOnly(core: EditorCore): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const disposable = core.events.on('modeChanged', onStoreChange);
      return (): void => {
        disposable.dispose();
      };
    },
    [core],
  );
  const getSnapshot = useCallback((): boolean => core.mode.readOnly, [core]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
