/**
 * The flow the Lumen editor opens with. It is data: an IGraph, the same format
 * the interpreter runs and the compiler prints.
 *
 * Interval counts up and Scale multiplies each count by ten; Range sends 1 to 5
 * once and Filter keeps the values of 3 and more. Merge interleaves both
 * streams, Sum keeps the running total, and Console shows it.
 */

import type { IConnection, IGraph, INodeInfo, ParamValue } from '@hlang-org/interpreter';

function node(
  nodeId: string,
  code: string,
  type: 'R' | 'T' | 'W',
  position: { readonly x: number; readonly y: number },
  params: Readonly<Record<string, ParamValue>> = {},
): INodeInfo {
  return { code, name: nodeId, type, nodeId, bizData: { params: { ...params } }, position };
}

function link(from: string, to: string, toPort = 'Input'): IConnection {
  return {
    Output: { nodeId: from, portConf: { id: 'Output' } },
    Input: { nodeId: to, portConf: { id: toPort } },
  };
}

export function starterFlow(): IGraph {
  return {
    nodeList: [
      node('interval', 'interval', 'R', { x: 0, y: 0 }, { periodMs: 700 }),
      node('scale', 'scale', 'T', { x: 250, y: 0 }, { factor: 10 }),
      node('range', 'range', 'R', { x: 0, y: 190 }, { start: 1, count: 5 }),
      node('filter', 'filter', 'T', { x: 250, y: 190 }, { min: 3 }),
      node('merge', 'merge', 'T', { x: 520, y: 86 }),
      node('sum', 'sum', 'T', { x: 770, y: 95 }),
      node('console', 'console', 'W', { x: 1010, y: 95 }),
    ],
    connections: [
      link('interval', 'scale'),
      link('scale', 'merge', 'A'),
      link('range', 'filter'),
      link('filter', 'merge', 'B'),
      link('merge', 'sum'),
      link('sum', 'console'),
    ],
  };
}
