/**
 * Pure, bidirectional conversion between the editor model and React Flow.
 *
 * The direction invariant is enforced here and mirrors editor-core exactly:
 *   - An `EditorEdge.source` is an OUTPUT (O) port -> React Flow `source` +
 *     `sourceHandle`.
 *   - An `EditorEdge.target` is an INPUT (I) port -> React Flow `target` +
 *     `targetHandle`.
 * React Flow's `Connection` uses the same field names, so a user-drawn
 * connection maps back with source=O-port and target=I-port.
 */

import type { Connection } from '@xyflow/react';
import type { EditorEdge, EditorNode, Endpoint } from '@hlang-org/editor-core';
import type { HlangEdgeData, HlangRFEdge, HlangRFNode } from './types';
import { findPort } from './types';

/** Per-node view flags reflected into React Flow (from editor-core's view-state). */
export interface NodeViewState {
  readonly hidden: boolean;
  readonly locked: boolean;
  /** Whether the node is selected in editor-core's selection service. */
  readonly selected?: boolean;
}

/**
 * Convert an editor node to a React Flow node. Optional `view` flags map to
 * React Flow's native `hidden` (removed from the rendered canvas), `selected`
 * (so programmatic selection like ⌘A reflects on the canvas), and, when locked,
 * `draggable`/`selectable: false` (pinned). Kept pure — callers supply the flags
 * from `core.viewState`/`core.selection`, so this stays trivially testable.
 */
export function toRFNode(node: EditorNode, view?: NodeViewState): HlangRFNode {
  const locked = view?.locked ?? false;
  return {
    id: node.id,
    type: node.kind,
    position: { x: node.position.x, y: node.position.y },
    data: { editorNode: node },
    hidden: view?.hidden ?? false,
    selected: view?.selected ?? false,
    draggable: !locked,
    selectable: !locked,
  };
}

/** Per-edge view flags reflected into React Flow. */
export interface EdgeViewState {
  /** Whether the edge is selected in editor-core's selection service. */
  readonly selected?: boolean;
}

/**
 * Convert an editor edge to a React Flow edge, preserving O->I direction.
 * `view.selected` keeps the canvas in step with editor-core's selection, as
 * for nodes.
 */
export function toRFEdge(edge: EditorEdge, sourceNode: EditorNode | undefined, view?: EdgeViewState): HlangRFEdge {
  const sourcePort = sourceNode ? findPort(sourceNode, edge.source.portId) : undefined;
  const data: HlangEdgeData = {
    sourcePortId: edge.source.portId,
    targetPortId: edge.target.portId,
    isError: sourcePort?.isError ?? edge.source.portId === '@node/error',
    stream: sourcePort?.stream ?? 'live',
    ...(edge.capacity === undefined ? {} : { capacity: edge.capacity }),
    ...(edge.overflow === undefined ? {} : { overflow: edge.overflow }),
  };
  return {
    id: edge.id,
    source: edge.source.nodeId,
    sourceHandle: edge.source.portId,
    target: edge.target.nodeId,
    targetHandle: edge.target.portId,
    selected: view?.selected ?? false,
    data,
  };
}

/**
 * Extract the source (O) and target (I) endpoints from a React Flow
 * connection. Returns `undefined` when either handle is missing — hlang always
 * wires named ports, so a connection without handles cannot be represented.
 */
export function endpointsFromConnection(
  connection: Connection,
): { readonly source: Endpoint; readonly target: Endpoint } | undefined {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (sourceHandle === null || targetHandle === null) {
    return undefined;
  }
  return {
    source: { nodeId: source, portId: sourceHandle },
    target: { nodeId: target, portId: targetHandle },
  };
}
