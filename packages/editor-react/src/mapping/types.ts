/**
 * Types bridging the headless editor model to React Flow's node/edge shapes.
 *
 * React Flow (`@xyflow/react`) is the ONLY rendering dependency, and it is
 * confined to this bindings package — `@hlang-org/editor-core` never imports it.
 * Here we define the data payload carried on each React Flow node/edge so custom
 * node/edge components (provided by `@hlang-org/editor-ui` or a host app) can
 * render from strongly-typed hlang data.
 */

import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react';
import type { EditorNode, NodeKind, PortDescriptor } from '@hlang-org/editor-core';

/**
 * Data payload attached to a React Flow node. Carries the full `EditorNode`
 * so custom node components can render ports, params, kind, etc. The index
 * signature satisfies React Flow's `Record<string, unknown>` data constraint
 * while keeping our own field strongly typed.
 */
export interface HlangNodeData extends Record<string, unknown> {
  readonly editorNode: EditorNode;
}

/**
 * Data payload attached to a React Flow edge. Carries the hlang port ids so a
 * custom edge can distinguish, e.g., an error-port edge from a normal one.
 */
export interface HlangEdgeData extends Record<string, unknown> {
  readonly sourcePortId: string;
  readonly targetPortId: string;
  /** Whether the source port is the `@node/error` port. */
  readonly isError: boolean;
  /** The source port's stream mode (`'live'` default | `'value'`), for edge visuals. */
  readonly stream: 'live' | 'value';
  /** A bounded connection's capacity and overflow (RFC 0001); absent when unbounded. */
  readonly capacity?: number;
  readonly overflow?: 'drop-oldest';
}

/** A React Flow node specialized to hlang. `type` is the node kind (R/T/W). */
export type HlangRFNode = RFNode<HlangNodeData, NodeKind>;

/** A React Flow edge specialized to hlang. */
export type HlangRFEdge = RFEdge<HlangEdgeData>;

/** Look up a port descriptor on an editor node by id. */
export function findPort(
  node: EditorNode,
  portId: string,
): PortDescriptor | undefined {
  return node.ports.find(port => port.id === portId);
}
