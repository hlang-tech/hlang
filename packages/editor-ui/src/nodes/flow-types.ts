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

// The registry entries for the hlang node and edge components.
const nodeComponent: NodeTypes[string] = HlangNode;
const edgeComponent: EdgeTypes[string] = FlowEdge;

/** Build the React Flow node/edge type maps for the hlang editor. */
export function createHlangFlowTypes(): HlangFlowTypes {
  return {
    nodeTypes: { R: nodeComponent, T: nodeComponent, W: nodeComponent },
    edgeTypes: { default: edgeComponent },
  };
}
