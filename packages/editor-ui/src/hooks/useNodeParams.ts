/**
 * `useNodeParams` — reactively read a node's params and commit edits through the
 * command service (so every change is undoable). Re-reads on the `nodeChanged`
 * event via a version counter (the same pattern editor-react's selectors use).
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { EditorCore, EditorNode, NodeId, ParamBag, ParamValue } from '@hlang-org/editor-core';
import { UpdateParamsCommand } from '@hlang-org/editor-core';

export interface NodeParamsHandle {
  /** The node, or undefined if it no longer exists. */
  readonly node: EditorNode | undefined;
  /** Set a single param, committing an undoable UpdateParamsCommand. */
  setParam(key: string, value: ParamValue): void;
  /** Replace the whole param bag, committing an undoable UpdateParamsCommand. */
  setParams(next: ParamBag): void;
}

export function useNodeParams(core: EditorCore, nodeId: NodeId | undefined): NodeParamsHandle {
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const disposable = core.events.on('nodeChanged', event => {
        if (nodeId !== undefined && event.node.id === nodeId) {
          versionRef.current += 1;
          onStoreChange();
        }
      });
      return (): void => {
        disposable.dispose();
      };
    },
    [core, nodeId],
  );

  const getSnapshot = useCallback((): number => versionRef.current, []);
  const version = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setParams = useCallback(
    (next: ParamBag): void => {
      if (nodeId === undefined) {
        return;
      }
      core.commands.execute(new UpdateParamsCommand(nodeId, next));
    },
    [core, nodeId],
  );

  const setParam = useCallback(
    (key: string, value: ParamValue): void => {
      if (nodeId === undefined) {
        return;
      }
      const node = core.model.getNode(nodeId);
      if (node === undefined) {
        return;
      }
      setParams({ ...node.params, [key]: value });
    },
    [core, nodeId, setParams],
  );

  return useMemo<NodeParamsHandle>(
    () => ({
      node: nodeId === undefined ? undefined : core.model.getNode(nodeId),
      setParam,
      setParams,
    }),
    // `version` re-reads the node after each nodeChanged for this id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [core, nodeId, version, setParam, setParams],
  );
}
