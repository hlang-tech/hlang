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
    // A graph usually arrives as JSON, where the types do not hold; this input is
    // deliberately outside INodeInfo to prove planGraph checks the kind at run time.
    const bad = { ...node('a', 'R'), type: 'X' } as unknown as INodeInfo;
    expect(codeOf(() => planGraph({ nodeList: [bad], connections: [] }))).toBe('invalid-node-kind');
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
});
