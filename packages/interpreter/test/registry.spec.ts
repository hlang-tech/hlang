/**
 * NodeRegistry behavior and interpreter edge cases.
 */

import { describe, it, expect } from 'vitest';
import { interpret, NodeRegistry } from '../src';
import type { IGraph, IInterpreterDeps, IRuntimeFlow } from '../src';
import { Flow, ValueSourceNode, makeCollectorSink } from './fixtures/nodes';

describe('NodeRegistry', () => {
  it('registers, resolves, reports membership and lists codes in order', () => {
    const registry = new NodeRegistry();
    expect(registry.has('src')).toBe(false);
    expect(registry.get('src')).toBeUndefined();

    registry
      .register('src', ValueSourceNode)
      .register('sink', makeCollectorSink([]));

    expect(registry.has('src')).toBe(true);
    expect(registry.get('src')).toBe(ValueSourceNode);
    expect(registry.codes()).toEqual(['src', 'sink']);
  });

  it('last write wins when a code is re-registered', () => {
    const registry = new NodeRegistry();
    const a = makeCollectorSink([]);
    const b = makeCollectorSink([]);
    registry.register('x', a).register('x', b);
    expect(registry.get('x')).toBe(b);
    expect(registry.codes()).toEqual(['x']);
  });
});

describe('interpret edge cases', () => {
  function deps(register: (r: NodeRegistry) => void): IInterpreterDeps {
    const registry = new NodeRegistry();
    register(registry);
    return { registry, createFlow: (): IRuntimeFlow => new Flow({}) };
  }

  it('throws when a connection references an unknown node', () => {
    const d = deps(r => {
      r.register('src', ValueSourceNode);
      r.register('sink', makeCollectorSink([]));
    });
    const graph: IGraph = {
      nodeList: [
        { code: 'src', name: 'src', type: 'R', nodeId: 'r1', bizData: { params: {} } },
      ],
      connections: [
        {
          Output: { nodeId: 'r1', portConf: { id: 'Output' } },
          Input: { nodeId: 'ghost', portConf: { id: 'Input' } },
        },
      ],
    };
    expect(() => interpret(graph, d)).toThrow(/unknown node/i);
  });

  it('honors flowId and env options on the handle', () => {
    const d = deps(r => r.register('src', ValueSourceNode));
    const graph: IGraph = {
      nodeList: [
        { code: 'src', name: 'src', type: 'R', nodeId: 'r1', bizData: { params: {} } },
      ],
      connections: [],
    };
    const handle = interpret(graph, d, { flowId: 'fixed-flow', env: 'test' });
    expect(handle.flowId).toBe('fixed-flow');
  });

  it('onError subscription can be disposed and the handle can be torn down', () => {
    const d = deps(r => r.register('src', ValueSourceNode));
    const graph: IGraph = {
      nodeList: [
        { code: 'src', name: 'src', type: 'R', nodeId: 'r1', bizData: { params: {} } },
      ],
      connections: [],
    };
    const handle = interpret(graph, d);
    const seen: unknown[] = [];
    const sub = handle.onError(e => seen.push(e));
    expect(() => sub.dispose()).not.toThrow();
    expect(() => handle.dispose()).not.toThrow();
    expect(seen).toEqual([]);
  });

  it('defaults bizData to an empty params bag when omitted', () => {
    const received: unknown[] = [];
    const d = deps(r => {
      r.register('src', ValueSourceNode);
      r.register('sink', makeCollectorSink(received));
    });
    const graph: IGraph = {
      nodeList: [
        { code: 'src', name: 'src', type: 'R', nodeId: 'r1' },
        { code: 'sink', name: 'sink', type: 'W', nodeId: 'w1' },
      ],
      connections: [
        {
          Output: { nodeId: 'r1', portConf: { id: 'Output' } },
          Input: { nodeId: 'w1', portConf: { id: 'Input' } },
        },
      ],
    };
    interpret(graph, d);
    // ValueSourceNode with no params sends null.
    expect(received).toEqual([null]);
  });
});
