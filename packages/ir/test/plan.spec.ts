import { describe, it, expect } from 'vitest';
import { planGraph, GraphError, ERROR_PORT_NAME } from '../src';
import type { IGraph, INodeInfo, IConnection, NodeKind } from '../src';

function node(nodeId: string, type: NodeKind, extra: Partial<INodeInfo> = {}): INodeInfo {
  return { nodeId, code: `${type.toLowerCase()}-code`, name: nodeId, type, ...extra };
}

function link(from: string, to: string, fromPort = 'out', toPort = 'in'): IConnection {
  return {
    Output: { nodeId: from, portConf: { id: fromPort } },
    Input: { nodeId: to, portConf: { id: toPort } },
  };
}

/**
 * A graph as it arrives: JSON, where the types do not hold. Tests use it to
 * prove that planGraph checks at run time what the types only document. This
 * is the one place the input is deliberately outside the IGraph types.
 */
function received(json: unknown): IGraph {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- deliberately invalid input, see above
  return json as IGraph;
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof GraphError ? error.code : 'not-a-graph-error';
  }
  return undefined;
}

describe('planGraph', () => {
  it('lowers nodes, connections, and roots in graph order', () => {
    const graph: IGraph = {
      nodeList: [
        node('a', 'R', { code: 'source', bizData: { params: { text: 'hi' } } }),
        node('b', 'T', { code: 'upper' }),
        node('c', 'W', { code: 'sink' }),
      ],
      connections: [link('a', 'b'), link('b', 'c')],
    };

    expect(planGraph(graph)).toEqual({
      nodes: [
        { nodeId: 'a', code: 'source', kind: 'R', config: { params: { text: 'hi' } } },
        { nodeId: 'b', code: 'upper', kind: 'T', config: { params: {} } },
        { nodeId: 'c', code: 'sink', kind: 'W', config: { params: {} } },
      ],
      connections: [
        { source: { nodeId: 'a', portId: 'out' }, target: { nodeId: 'b', portId: 'in' } },
        { source: { nodeId: 'b', portId: 'out' }, target: { nodeId: 'c', portId: 'in' } },
      ],
      roots: ['a'],
    });
  });

  it('defaults missing port ids to Output (source) and Input (target)', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'R'), node('b', 'W')],
      connections: [{ Output: { nodeId: 'a' }, Input: { nodeId: 'b' } }],
    };
    expect(planGraph(graph).connections).toEqual([
      { source: { nodeId: 'a', portId: 'Output' }, target: { nodeId: 'b', portId: 'Input' } },
    ]);
  });

  it('reads the legacy portConfig.id spelling', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'R'), node('b', 'W')],
      connections: [
        { Output: { nodeId: 'a', portConfig: { id: 'o' } }, Input: { nodeId: 'b', portConfig: { id: 'i' } } },
      ],
    };
    expect(planGraph(graph).connections[0]).toEqual({
      source: { nodeId: 'a', portId: 'o' },
      target: { nodeId: 'b', portId: 'i' },
    });
  });

  it('keeps every Readable node as a root, and accepts T<->T feedback', () => {
    const graph: IGraph = {
      nodeList: [node('r1', 'R'), node('r2', 'R'), node('t1', 'T'), node('t2', 'T')],
      connections: [link('r1', 't1'), link('t1', 't2'), link('t2', 't1')],
    };
    expect(planGraph(graph).roots).toEqual(['r1', 'r2']);
  });

  it('accepts a Transform connected to itself: iteration, as any T<->T feedback', () => {
    const graph: IGraph = {
      nodeList: [node('r1', 'R'), node('t1', 'T')],
      connections: [link('r1', 't1'), link('t1', 't1', 'again', 'in')],
    };
    expect(planGraph(graph).connections).toContainEqual({
      source: { nodeId: 't1', portId: 'again' },
      target: { nodeId: 't1', portId: 'in' },
    });
  });

  it('allows an error port as a connection source', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'R'), node('b', 'W')],
      connections: [link('a', 'b', ERROR_PORT_NAME)],
    };
    expect(planGraph(graph).connections[0]?.source.portId).toBe(ERROR_PORT_NAME);
  });

  it('rejects a graph without a Readable node', () => {
    const graph: IGraph = { nodeList: [node('t', 'T')], connections: [] };
    expect(codeOf(() => planGraph(graph))).toBe('no-readable-root');
    expect(() => planGraph(graph)).toThrow(/readable/i);
  });

  it('rejects duplicate node ids', () => {
    const graph: IGraph = { nodeList: [node('a', 'R'), node('a', 'W')], connections: [] };
    expect(codeOf(() => planGraph(graph))).toBe('duplicate-node-id');
  });

  it('rejects an unknown node kind', () => {
    const graph = received({ nodeList: [{ ...node('a', 'R'), type: 'X' }], connections: [] });
    expect(codeOf(() => planGraph(graph))).toBe('invalid-node-kind');
  });

  it('rejects a connection to an unknown node', () => {
    const graph: IGraph = { nodeList: [node('a', 'R')], connections: [link('a', 'ghost')] };
    expect(codeOf(() => planGraph(graph))).toBe('unknown-node');
    expect(() => planGraph(graph)).toThrow(/unknown node/i);
  });

  it('rejects a Writable node as a connection source', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'R'), node('w', 'W'), node('t', 'T')],
      connections: [link('w', 't')],
    };
    expect(codeOf(() => planGraph(graph))).toBe('invalid-connection');
  });

  it('rejects a Readable node as a connection target', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'R'), node('b', 'R')],
      connections: [link('a', 'b')],
    };
    expect(codeOf(() => planGraph(graph))).toBe('invalid-connection');
  });

  it('rejects the error port as a connection target', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'R'), node('t', 'T')],
      connections: [link('a', 't', 'out', ERROR_PORT_NAME)],
    };
    expect(codeOf(() => planGraph(graph))).toBe('invalid-connection');
  });

  it('does not alias the caller graph in the plan', () => {
    const params = { n: 1 };
    const graph: IGraph = { nodeList: [node('a', 'R', { bizData: { params } })], connections: [] };
    const plan = planGraph(graph);
    expect(plan.nodes[0]?.config).toEqual({ params: { n: 1 } });
    expect(plan.nodes[0]?.config).not.toBe(graph.nodeList[0]?.bizData);
  });

  describe('bounded connections (RFC 0001)', () => {
    const graph = (extra: Readonly<Record<string, unknown>>): IGraph =>
      received({ nodeList: [node('r1', 'R'), node('w1', 'W')], connections: [{ ...link('r1', 'w1'), ...extra }] });

    it('carries capacity and overflow into the plan', () => {
      expect(planGraph(graph({ capacity: 4, overflow: 'drop-oldest' })).connections).toEqual([
        { source: { nodeId: 'r1', portId: 'out' }, target: { nodeId: 'w1', portId: 'in' }, capacity: 4, overflow: 'drop-oldest' },
      ]);
    });

    it('leaves an unbounded connection as it was', () => {
      expect(planGraph(graph({})).connections).toEqual([
        { source: { nodeId: 'r1', portId: 'out' }, target: { nodeId: 'w1', portId: 'in' } },
      ]);
    });

    it('rejects a capacity that is not a positive integer', () => {
      for (const capacity of [0, -1, 1.5, '4', null]) {
        expect(codeOf(() => planGraph(graph({ capacity })))).toBe('invalid-connection');
      }
    });

    it('carries a capacity without an overflow', () => {
      expect(planGraph(graph({ capacity: 2 })).connections[0]).toEqual({
        source: { nodeId: 'r1', portId: 'out' },
        target: { nodeId: 'w1', portId: 'in' },
        capacity: 2,
      });
    });

    it('names in its error a value JSON cannot print', () => {
      expect(() => planGraph(graph({ capacity: () => 2 }))).toThrow('has capacity function; expected a positive integer');
    });

    it('rejects an unknown overflow, and an overflow without a capacity', () => {
      expect(codeOf(() => planGraph(graph({ capacity: 2, overflow: 'drop-newest' })))).toBe('invalid-connection');
      expect(codeOf(() => planGraph(graph({ overflow: 'drop-oldest' })))).toBe('invalid-connection');
    });
  });
});
