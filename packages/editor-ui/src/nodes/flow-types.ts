/**
 * One-line React Flow wiring: `createHlangFlowTypes()` returns the `nodeTypes`
 * and `edgeTypes` maps to spread onto `<ReactFlow>`, binding hlang's R/T/W node
 * kinds to `HlangNode` and the default edge to the flowing `FlowEdge`.
 *
 * ```tsx
 * const { nodeTypes, edgeTypes } = createHlangFlowTypes();
 * <ReactFlow nodeTypes={nodeTypes} edgeTypes={edgeTypes} {...useHlangFlow(core)} />
 * ```
 */

import type { EdgeTypes, NodeTypes } from '@xyflow/react';
import { HlangNode } from './HlangNode';
import { FlowEdge } from '../edges/FlowEdge';

export interface HlangFlowTypes {
  readonly nodeTypes: NodeTypes;
  readonly edgeTypes: EdgeTypes;
}

// React Flow's `NodeTypes`/`EdgeTypes` are keyed to the BASE node/edge props
// (data: Record<string, unknown>), while our components declare the specific
// `HlangRFNode`/`HlangRFEdge` data shape. The two are runtime-compatible — our
// components only read fields that exist on the base type plus our own data —
// but not structurally assignable, a well-known React Flow typing friction.
// We narrow the entries to the registry types at this single boundary.
const nodeComponent = HlangNode as NodeTypes[string];
const edgeComponent = FlowEdge as EdgeTypes[string];

/** Build the React Flow node/edge type maps for the hlang editor. */
export function createHlangFlowTypes(): HlangFlowTypes {
  return {
    nodeTypes: { R: nodeComponent, T: nodeComponent, W: nodeComponent },
    edgeTypes: { default: edgeComponent },
  };
}
