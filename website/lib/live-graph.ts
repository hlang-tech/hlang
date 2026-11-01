/**
 * The program behind the live graph on the home page, as an IGraph.
 * The same object is run by the interpreter in the browser and compiled by
 * @hlang-org/compiler at build time.
 */

import type { IGraph } from '@hlang-org/ir';

export const TRANSFORM_CODES = ['uppercase', 'reverse', 'length'] as const;
export type TransformCode = (typeof TRANSFORM_CODES)[number];

export function liveGraph(transform: TransformCode): IGraph {
  return {
    nodeList: [
      { nodeId: 'text', code: 'text-source', name: 'Text', type: 'R' },
      { nodeId: 'transform', code: transform, name: 'Transform', type: 'T' },
      { nodeId: 'print', code: 'print', name: 'Output', type: 'W' },
    ],
    connections: [
      { Output: { nodeId: 'text', portConf: { id: 'out' } }, Input: { nodeId: 'transform', portConf: { id: 'in' } } },
      { Output: { nodeId: 'transform', portConf: { id: 'out' } }, Input: { nodeId: 'print', portConf: { id: 'in' } } },
    ],
  };
}
