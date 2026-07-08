/**
 * `useReconnect` — reconnect an existing edge to a new port (React Flow's
 * `onReconnect`) as one undoable step, and splice a node onto an edge
 * ("drop on edge to insert") via the core's smart `planInsertOnEdge`.
 *
 * Both go through the command service inside a single `history.transact`, so the
 * whole change is one undo unit. Legality is the core's job: reconnect validates
 * via `ConnectCommand` (which runs the validator), and insertion uses
 * `planInsertOnEdge` (returns null for an illegal splice — e.g. R/W nodes).
 */

import { useCallback } from 'react';
import type { Connection } from '@xyflow/react';
import type { EditorCore, EditorEdge, NodeId, Point } from '@hlang-org/editor-core';
import {
  ConnectCommand,
  DisconnectCommand,
  MoveNodeCommand,
  planInsertOnEdge,
  distanceToSegment,
} from '@hlang-org/editor-core';
import type { HlangRFEdge } from '../mapping/types';
import { endpointsFromConnection } from '../mapping/convert';

/** A node's live geometry (flow space) supplied by the host for hit-testing. */
export interface NodeBox {
  /** Top-left in flow coords (React Flow's absolute position). */
  readonly position: Point;
  /** Measured size in flow units; used to derive the centre + hit tolerance. */
  readonly width: number;
  readonly height: number;
}

export interface ReconnectHandle {
  /** RF onReconnect: move an edge's endpoint to a new port (one undo step). */
  onReconnect(oldEdge: HlangRFEdge, connection: Connection): void;
  /**
   * Given a dragged node's live box, find the nearest edge its centre lands on
   * (within a tolerance derived from the node's own size), or undefined. This
   * owns the geometry (edge iteration + point-to-segment distance) so hosts don't
   * re-implement it. Edges incident to the node itself are ignored.
   */
  hitTestEdge(nodeId: NodeId, box: NodeBox): string | undefined;
  /**
   * Splice `nodeId` onto `edgeId` (drop-on-edge insert). Returns true if a legal
   * splice happened. Optionally snaps the node to `at` (e.g. the edge midpoint).
   */
  insertOnEdge(nodeId: NodeId, edgeId: string, at?: Point): boolean;
}

export function useReconnect(core: EditorCore): ReconnectHandle {
  const onReconnect = useCallback(
    (oldEdge: HlangRFEdge, connection: Connection): void => {
      const endpoints = endpointsFromConnection(connection);
      if (endpoints === undefined) {
        return;
      }
      const edgeId = core.idGenerator.nextEdgeId();
      core.history.transact('Reconnect', () => {
        core.commands.execute(new DisconnectCommand(oldEdge.id));
        core.commands.execute(new ConnectCommand(edgeId, endpoints.source, endpoints.target));
      });
    },
    [core],
  );

  const hitTestEdge = useCallback(
    (nodeId: NodeId, box: NodeBox): string | undefined => {
      const halfW = box.width / 2;
      const halfH = box.height / 2;
      const center = { x: box.position.x + halfW, y: box.position.y + halfH };
      // The node's own half-extent is the natural hit tolerance (a data-driven
      // radius, not a magic pixel constant).
      const tolerance = Math.max(halfW, halfH, 1);

      let bestId: string | undefined;
      let bestDist = Infinity;
      for (const edge of core.model.getEdges()) {
        if (edge.source.nodeId === nodeId || edge.target.nodeId === nodeId) {
          continue;
        }
        const src = core.model.getNode(edge.source.nodeId);
        const tgt = core.model.getNode(edge.target.nodeId);
        if (src === undefined || tgt === undefined) {
          continue;
        }
        // Approximate the edge by the segment between the endpoint nodes' top-
        // lefts — close enough for drop targeting; port-anchor precision is
        // deferred to the node-interaction work.
        const dist = distanceToSegment(center, src.position, tgt.position);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = edge.id;
        }
      }
      return bestDist <= tolerance ? bestId : undefined;
    },
    [core],
  );

  const insertOnEdge = useCallback(
    (nodeId: NodeId, edgeId: string, at?: Point): boolean => {
      const node = core.model.getNode(nodeId);
      const edge: EditorEdge | undefined = core.model.getEdge(edgeId);
      if (node === undefined || edge === undefined) {
        return false;
      }
      const plan = planInsertOnEdge(node, edge, core.model, core.validator, core.idGenerator);
      if (plan === null) {
        return false;
      }
      core.history.transact('Insert on Edge', () => {
        core.commands.execute(new DisconnectCommand(edge.id));
        core.commands.execute(
          new ConnectCommand(plan.sourceEdge.id, plan.sourceEdge.source, plan.sourceEdge.target),
        );
        core.commands.execute(
          new ConnectCommand(plan.targetEdge.id, plan.targetEdge.source, plan.targetEdge.target),
        );
        if (at !== undefined) {
          core.commands.execute(new MoveNodeCommand(nodeId, at));
        }
      });
      return true;
    },
    [core],
  );

  return { onReconnect, hitTestEdge, insertOnEdge };
}
