/**
 * Interpreter behavior, verified against the real `@hlang-org/runtime` engine.
 *
 * TDD: these are written before the implementation and must fail first.
 */

import { describe, it, expect } from 'vitest';
import { interpret, NodeRegistry } from '../src';
import type { IInterpreterDeps } from '../src';
import type { IGraph, ParamValue } from '../src';
import type { IRuntimeFlow } from '../src';
import {
  Flow,
  ValueSourceNode,
  WrapTransformNode,
  ThrowingTransformNode,
  EchoTransformNode,
  makeCollectorSink,
  makeStreamingSource,
  makePairSink,
} from './fixtures/nodes';

/** Build interpreter deps from the real runtime Flow + a fresh registry. */
function makeDeps(register: (r: NodeRegistry) => void): IInterpreterDeps {
  const registry = new NodeRegistry();
  register(registry);
  return {
    registry,
    createFlow: (): IRuntimeFlow => new Flow({}),
  };
}

/** Minimal IGraph builders keep the test bodies readable. */
function rNode(nodeId: string, code: string, value?: ParamValue): IGraph['nodeList'][number] {
  return {
    code,
    name: code,
    type: 'R',
    nodeId,
    bizData: { params: value === undefined ? {} : { value } },
  };
}
function tNode(nodeId: string, code: string): IGraph['nodeList'][number] {
  return { code, name: code, type: 'T', nodeId, bizData: { params: {} } };
}
function wNode(nodeId: string, code: string): IGraph['nodeList'][number] {
  return { code, name: code, type: 'W', nodeId, bizData: { params: {} } };
}
function edge(fromNodeId: string, toNodeId: string, toPort = 'Input'): IGraph['connections'][number] {
  return {
    Output: { nodeId: fromNodeId, portConf: { id: 'Output' } },
    Input: { nodeId: toNodeId, portConf: { id: toPort } },
  };
}

describe('interpret', () => {
  it('case 1: R -> W delivers the source payload to the sink', () => {
    const received: unknown[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('sink', makeCollectorSink(received));
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'src', 'hello'), wNode('w1', 'sink')],
      connections: [edge('r1', 'w1')],
    };

    interpret(graph, deps);

    expect(received).toEqual(['hello']);
  });

  it('case 2: R -> T -> W transforms the payload in transit', () => {
    const received: unknown[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('wrap', WrapTransformNode);
      r.register('sink', makeCollectorSink(received));
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'src', 42), tNode('t1', 'wrap'), wNode('w1', 'sink')],
      connections: [edge('r1', 't1'), edge('t1', 'w1')],
    };

    interpret(graph, deps);

    expect(received).toEqual([{ seen: 42 }]);
  });

  it('case 2b: onActivity reports output-port emissions across the run (living stream)', () => {
    const received: unknown[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('wrap', WrapTransformNode);
      r.register('sink', makeCollectorSink(received));
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'src', 7), tNode('t1', 'wrap'), wNode('w1', 'sink')],
      connections: [edge('r1', 't1'), edge('t1', 'w1')],
    };

    const handle = interpret(graph, deps);
    const activity: string[] = [];
    // Subscribed AFTER interpret returns — the bounded replay buffer must still
    // surface the synchronous run's emissions.
    handle.onActivity(e => activity.push(`${e.nodeId}.${e.portId}`));

    expect(activity).toContain('r1.Output');
    expect(activity).toContain('t1.Output');
    // The error port must not appear as activity.
    expect(activity.some(a => a.includes('@node/error'))).toBe(false);
  });

  it('case 2c: dispose() stops a streaming node (no leaked interval)', async () => {
    const emitted: number[] = [];
    const deps = makeDeps(r => {
      r.register('stream', makeStreamingSource(emitted, 20));
      r.register('sink', makeCollectorSink([]));
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'stream'), wNode('w1', 'sink')],
      connections: [edge('r1', 'w1')],
    };

    const handle = interpret(graph, deps);
    // Let a few ticks fire.
    await new Promise(resolve => setTimeout(resolve, 80));
    const countAtStop = emitted.length;
    expect(countAtStop).toBeGreaterThan(0);

    handle.dispose();
    // After dispose, no further ticks should be recorded.
    await new Promise(resolve => setTimeout(resolve, 80));
    expect(emitted.length).toBe(countAtStop);
  });

  it('case 3: direction is Output=source, Input=target (reversed wiring does not deliver)', () => {
    const received: unknown[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('sink', makeCollectorSink(received));
    });
    // Deliberately reversed: name the sink as Output(source) and R as Input(target).
    const reversed: IGraph = {
      nodeList: [rNode('r1', 'src', 'x'), wNode('w1', 'sink')],
      connections: [
        {
          Output: { nodeId: 'w1', portConf: { id: 'Output' } },
          Input: { nodeId: 'r1', portConf: { id: 'Input' } },
        },
      ],
    };

    // A W node has no Output port and an R node has no Input port, so wiring
    // in the wrong direction must not deliver anything (and must not silently
    // succeed as if correct).
    expect(() => interpret(reversed, deps)).toThrow();
    expect(received).toEqual([]);
  });

  it('case 4: multiple R roots each drive their own downstream', () => {
    const received: unknown[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('sink', makeCollectorSink(received));
    });
    const graph: IGraph = {
      nodeList: [
        rNode('r1', 'src', 'a'),
        rNode('r2', 'src', 'b'),
        wNode('w1', 'sink'),
        wNode('w2', 'sink'),
      ],
      connections: [edge('r1', 'w1'), edge('r2', 'w2')],
    };

    interpret(graph, deps);

    expect(received.sort()).toEqual(['a', 'b']);
  });

  it('case 5: a graph with zero Readable nodes throws', () => {
    const deps = makeDeps(r => {
      r.register('wrap', WrapTransformNode);
      r.register('sink', makeCollectorSink([]));
    });
    const graph: IGraph = {
      nodeList: [tNode('t1', 'wrap'), wNode('w1', 'sink')],
      connections: [edge('t1', 'w1')],
    };

    expect(() => interpret(graph, deps)).toThrow(/readable/i);
  });

  it('case 6: T<->T feedback loop is accepted without hanging or throwing', () => {
    const received: unknown[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('echo', EchoTransformNode);
      r.register('sink', makeCollectorSink(received));
    });
    // r1 -> t1 -> t2 -> t1 (feedback) ; t2 -> w1
    const graph: IGraph = {
      nodeList: [
        rNode('r1', 'src', 'seed'),
        tNode('t1', 'echo'),
        tNode('t2', 'echo'),
        wNode('w1', 'sink'),
      ],
      connections: [
        edge('r1', 't1'),
        edge('t1', 't2'),
        edge('t2', 't1'),
        edge('t2', 'w1'),
      ],
    };

    expect(() => interpret(graph, deps)).not.toThrow();
    expect(received).toContain('seed');
  });

  it('case 7: node errors surface on the @node/error port via onError', () => {
    const errors: unknown[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('kaboom', ThrowingTransformNode);
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'src', 'trigger'), tNode('t1', 'kaboom')],
      connections: [edge('r1', 't1')],
    };

    const handle = interpret(graph, deps);
    handle.onError(e => errors.push(e.error));

    // Error subscription is wired before R fires only if the interpreter
    // subscribes error ports prior to flow.run; assert we captured it.
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
  });

  it('case 8: interpret throws when a node code is not registered', () => {
    const deps = makeDeps(() => {
      /* register nothing */
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'missing', 'x')],
      connections: [],
    };

    expect(() => interpret(graph, deps)).toThrow(/missing|registered|unknown/i);
  });

  it('case 9: getNode resolves constructed instances by nodeId', () => {
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('sink', makeCollectorSink([]));
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'src', 1), wNode('w1', 'sink')],
      connections: [edge('r1', 'w1')],
    };

    const handle = interpret(graph, deps);

    expect(handle.getNode('r1')).toBeDefined();
    expect(handle.getNode('w1')).toBeDefined();
    expect(handle.getNode('nope')).toBeUndefined();
    expect(handle.roots).toHaveLength(1);
  });

  it('case 10: two connections between the same two nodes both deliver', () => {
    const received: { Left: unknown[]; Right: unknown[] } = { Left: [], Right: [] };
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('pair', makePairSink(received));
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'src', 'v'), wNode('w1', 'pair')],
      connections: [edge('r1', 'w1', 'Left'), edge('r1', 'w1', 'Right')],
    };

    interpret(graph, deps);

    expect(received).toEqual({ Left: ['v'], Right: ['v'] });
  });
});
