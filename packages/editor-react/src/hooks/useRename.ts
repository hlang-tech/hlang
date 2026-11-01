/**
 * `useRename` — rename a node through the command service, so the change is
 * undoable and emits `nodeChanged` (which the canvas already reconciles on).
 */

import { useCallback } from 'react';
import type { EditorCore, NodeId } from '@hlang-org/editor-core';
import { RenameNodeCommand } from '@hlang-org/editor-core';

export interface RenameHandle {
  rename(id: NodeId, name: string): void;
}

export function useRename(core: EditorCore): RenameHandle {
  const rename = useCallback(
    (id: NodeId, name: string): void => {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        return;
      }
      const current = core.model.getNode(id);
      if (current === undefined || current.name === trimmed) {
        return;
      }
      core.commands.execute(new RenameNodeCommand(id, trimmed));
    },
    [core],
  );
  return { rename };
}
