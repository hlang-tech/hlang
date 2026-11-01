/**
 * The flow the Lumen editor opens with. It is data: an IGraph, the same format
 * the interpreter runs and the compiler prints.
 *
 * The full flow: two clocks feed one running total, and every node keeps
 * working for as long as the flow runs. The fast clock ticks every 0.4 s and
 * Scale multiplies each count by ten. The slow clock ticks four times slower,
 * every 1.6 s, and Countdown, wired back into itself, turns each count n into
 * n, n - 1, ..., 0: iteration as a connection. Merge interleaves both
 * streams, Sum keeps the running total, and Console shows it.
 *
 * The compact flow, for a narrow canvas, is the same idea in three nodes that
 * stay readable at phone width: Interval, Sum, Console.
 */

import type { IConnection, IGraph, INodeInfo, ParamValue } from '@hlang-org/interpreter';

function node(
  nodeId: string,
  code: string,
  type: 'R' | 'T' | 'W',
  position: { readonly x: number; readonly y: number },
  params: Readonly<Record<string, ParamValue>> = {},
  name: string = nodeId,
): INodeInfo {
  return { code, name, type, nodeId, bizData: { params: { ...params } }, position };
}

function link(from: string, to: string, toPort = 'Input', fromPort = 'Output'): IConnection {
  return {
    Output: { nodeId: from, portConf: { id: fromPort } },
    Input: { nodeId: to, portConf: { id: toPort } },
  };
}

export function starterFlow(compact = false): IGraph {
  if (compact) {
    return {
      nodeList: [
        node('interval', 'interval', 'R', { x: 0, y: 0 }, { periodMs: 700 }),
        node('sum', 'sum', 'T', { x: 140, y: 0 }),
        node('console', 'console', 'W', { x: 275, y: 0 }),
      ],
      connections: [link('interval', 'sum'), link('sum', 'console')],
    };
  }
  return {
    nodeList: [
      node('fast-clock', 'interval', 'R', { x: 0, y: 0 }, { periodMs: 400 }, 'fast clock'),
      node('scale', 'scale', 'T', { x: 215, y: 0 }, { factor: 10 }),
      node('slow-clock', 'interval', 'R', { x: 0, y: 150 }, { periodMs: 1600 }, 'slow clock'),
      node('countdown', 'countdown', 'T', { x: 215, y: 150 }),
      node('merge', 'merge', 'T', { x: 440, y: 66 }),
      node('sum', 'sum', 'T', { x: 650, y: 75 }),
      node('console', 'console', 'W', { x: 855, y: 75 }),
    ],
    connections: [
      link('fast-clock', 'scale'),
      link('scale', 'merge', 'A'),
      link('slow-clock', 'countdown'),
      link('countdown', 'countdown', 'Input', 'Loop'),
      link('countdown', 'merge', 'B'),
      link('merge', 'sum'),
      link('sum', 'console'),
    ],
  };
}
