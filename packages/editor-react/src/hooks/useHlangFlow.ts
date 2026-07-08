/**
 * `useHlangFlow` — bridges a headless `EditorCore` to a React Flow canvas using
 * React Flow's own change-based model, so interactions like dragging stay
 * smooth.
 *
 * Design (this matters for performance):
 *  - React Flow owns the LIVE nodes/edges via `useNodesState`/`useEdgesState`.
 *    Every gesture (drag, select) is applied locally with
 *    `applyNodeChanges`/`applyEdgeChanges` — smooth, no full re-derivation.
 *  - The core is the SEMANTIC source of truth. We only push to it at commit
 *    points: a finished drag (`dragging === false`), a remove, or a select.
 *    Intermediate drag frames never touch the core, so they never trigger a
 *    global rebuild.
 *  - When the core's graph changes STRUCTURALLY (add/remove node, connect,
 *    undo/redo), we reconcile that back into React Flow's state — preserving
 *    each surviving node's live position so an in-flight view isn't disturbed.
 *
 * ```tsx
 * const flow = useHlangFlow(core);
 * <ReactFlow {...flow} nodeTypes={nodeTypes} edgeTypes={edgeTypes} />
 * ```
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type { Connection, IsValidConnection, NodeChange, EdgeChange } from '@xyflow/react';
import type { EditorCore, IDisposable } from '@hlang-org/editor-core';
import { MoveNodeCommand, RemoveNodeCommand, DisconnectCommand } from '@hlang-org/editor-core';
import { useConnect, useIsValidConnection } from './useConnect';
import { RECONCILE_EVENTS } from './reconcile-events';
import { toRFEdge, toRFNode } from '../mapping/convert';
import type { HlangRFNode, HlangRFEdge } from '../mapping/types';


export interface HlangFlowProps {
  readonly nodes: HlangRFNode[];
  readonly edges: HlangRFEdge[];
  readonly onNodesChange: (changes: NodeChange<HlangRFNode>[]) => void;
  readonly onEdgesChange: (changes: EdgeChange<HlangRFEdge>[]) => void;
  readonly onConnect: (connection: Connection) => void;
  readonly isValidConnection: IsValidConnection;
  /**
   * Force a full re-derivation from the core. The event-driven reconcile only
   * fires on structural events; a BULK load (`model.restore` importing a whole
   * IGraph) emits none, so the host calls this once after importing a graph.
   */
  readonly resync: () => void;
}

function deriveNodes(core: EditorCore): HlangRFNode[] {
  return core.model.getNodes().map(node =>
    toRFNode(node, {
      hidden: core.viewState.isHidden(node.id),
      locked: core.viewState.isLocked(node.id),
      selected: core.selection.isSelected(node.id),
    }),
  );
}
function deriveEdges(core: EditorCore): HlangRFEdge[] {
  return core.model
    .getEdges()
    .map(edge => toRFEdge(edge, core.model.getNode(edge.source.nodeId)));
}

export function useHlangFlow(core: EditorCore): HlangFlowProps {
  const [nodes, setNodes] = useNodesState<HlangRFNode>(deriveNodes(core));
  const [edges, setEdges] = useEdgesState<HlangRFEdge>(deriveEdges(core));
  const onConnect = useConnect(core);
  const isValidConnection = useIsValidConnection(core);

  // Guards a reentrancy problem: when WE mutate the core (e.g. commit a drag),
  // the resulting structural event must not clobber the live positions we just
  // set. `applyingLocal` suppresses reconcile during our own commits.
  const applyingLocal = useRef(false);

  // Ids currently being dragged. Only these keep their LIVE local position on
  // reconcile; every other node adopts the core's position. This is what lets
  // undo/redo (which change positions IN the core) actually move the canvas,
  // while an in-flight drag is never interrupted by a structural change.
  const draggingIds = useRef<Set<string>>(new Set());

  // Reconcile the core graph into local state on structural change. Core is the
  // source of truth for position; only a node mid-drag retains its live pos.
  useEffect(() => {
    const reconcile = (): void => {
      if (applyingLocal.current) {
        return;
      }
      setNodes(prev => {
        const livePos = new Map(prev.map(n => [n.id, n.position]));
        return deriveNodes(core).map(n => {
          if (draggingIds.current.has(n.id)) {
            const pos = livePos.get(n.id);
            return pos === undefined ? n : { ...n, position: pos };
          }
          return n;
        });
      });
      setEdges(deriveEdges(core));
    };
    const disposables: IDisposable[] = RECONCILE_EVENTS.map(kind =>
      core.events.on(kind, reconcile),
    );
    return (): void => {
      for (const disposable of disposables) {
        disposable.dispose();
      }
    };
  }, [core, setNodes, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<HlangRFNode>[]): void => {
      // 1. Apply locally for immediate, smooth feedback.
      setNodes(prev => applyNodeChanges(changes, prev));
      // 2. Commit only semantic changes to the core.
      for (const change of changes) {
        if (change.type === 'position') {
          if (change.dragging === true) {
            // Mark as mid-drag so reconcile preserves its live position.
            draggingIds.current.add(change.id);
          } else if (change.position !== undefined) {
            // Drag finished: commit to the core and stop tracking it.
            draggingIds.current.delete(change.id);
            applyingLocal.current = true;
            core.commands.execute(new MoveNodeCommand(change.id, change.position));
            applyingLocal.current = false;
          }
        } else if (change.type === 'remove') {
          applyingLocal.current = true;
          core.commands.execute(new RemoveNodeCommand(change.id));
          applyingLocal.current = false;
        } else if (change.type === 'select') {
          // RF already applied the select locally (step 1); mirror it into the
          // core WITHOUT letting the resulting `selectionChanged` reconcile clobber
          // the just-applied local nodes mid-gesture (that reentrancy caused a
          // transient duplicate-key render during box-select/pan).
          const selected = core.selection.isSelected(change.id);
          applyingLocal.current = true;
          if (change.selected && !selected) {
            core.selection.selectNodes([change.id], 'add');
          } else if (!change.selected && selected) {
            core.selection.selectNodes([change.id], 'toggle');
          }
          applyingLocal.current = false;
        }
      }
    },
    [core, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<HlangRFEdge>[]): void => {
      setEdges(prev => applyEdgeChanges(changes, prev));
      for (const change of changes) {
        if (change.type === 'remove') {
          applyingLocal.current = true;
          core.commands.execute(new DisconnectCommand(change.id));
          applyingLocal.current = false;
        } else if (change.type === 'select') {
          const selected = core.selection.isSelected(change.id);
          if (change.selected && !selected) {
            core.selection.selectEdges([change.id], 'add');
          } else if (!change.selected && selected) {
            core.selection.selectEdges([change.id], 'toggle');
          }
        }
      }
    },
    [core, setEdges],
  );

  const resync = useCallback((): void => {
    setNodes(deriveNodes(core));
    setEdges(deriveEdges(core));
  }, [core, setNodes, setEdges]);

  return useMemo<HlangFlowProps>(
    () => ({ nodes, edges, onNodesChange, onEdgesChange, onConnect, isValidConnection, resync }),
    [nodes, edges, onNodesChange, onEdgesChange, onConnect, isValidConnection, resync],
  );
}
