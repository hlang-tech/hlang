/**
 * Interpreter behavior, verified against the real `@hlang-org/runtime` engine.
 *
 * TDD: these are written before the implementation and must fail first.
 */

import { describe, it, expect, vi } from 'vitest';
import { Subject } from 'rxjs';
import { interpret, NodeRegistry } from '../src';
import type { IInterpreterDeps } from '../src';
import type { IGraph, ParamValue } from '../src';
import type { IRuntimeFlow, IRuntimeFlowOptions, INodeDeliveryEvent, INodeErrorEvent } from '../src';
import {
  Flow,
  ValueSourceNode,
  WrapTransformNode,
  ThrowingTransformNode,
  EchoTransformNode,
  makeCollectorSink,
  makeStreamingSource,
  makeTeardownSource,
  makePairSink,
  makeThrowingSink,
  makeLoopTransform,
  makeAsyncSink,
} from './fixtures/nodes';
import { Port, ReadableNode } from './fixtures/nodes';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '../src';

/** Build interpreter deps from the real runtime Flow + a fresh registry. */
function makeDeps(register: (r: NodeRegistry) => void): IInterpreterDeps {
  const registry = new NodeRegistry();
  register(registry);
  return {
    registry,
    createFlow: (options: IRuntimeFlowOptions): IRuntimeFlow => new Flow(options),
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

  it('case 2d: dispose() disposes the runtime flow, running node teardowns', async () => {
    const emitted: number[] = [];
    const received: unknown[] = [];
    const deps = makeDeps(r => {
      r.register('stream', makeTeardownSource(emitted, 10));
      r.register('sink', makeCollectorSink(received));
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'stream'), wNode('w1', 'sink')],
      connections: [edge('r1', 'w1')],
    };

    const handle = interpret(graph, deps);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received.length).toBeGreaterThan(0);

    handle.dispose();
    const emittedAtStop = emitted.length;
    const receivedAtStop = received.length;
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(emitted.length).toBe(emittedAtStop);
    expect(received.length).toBe(receivedAtStop);
  });

  it('case 2e: dispose() works with a flow that has no dispose', () => {
    const runs: unknown[] = [];
    const deps: IInterpreterDeps = {
      registry: makeDeps(r => {
        r.register('src', ValueSourceNode);
      }).registry,
      createFlow: (): IRuntimeFlow => ({ run: root => runs.push(root) }),
    };
    const handle = interpret({ nodeList: [rNode('r1', 'src', 'x')], connections: [] }, deps);
    expect(runs).toHaveLength(1);
    expect(() => handle.dispose()).not.toThrow();
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

describe('tracing', () => {
  const chain: IGraph = {
    nodeList: [rNode('r1', 'src', 'hi'), tNode('t1', 'wrap'), wNode('w1', 'sink')],
    connections: [edge('r1', 't1'), edge('t1', 'w1')],
  };
  const register = (r: NodeRegistry): void => {
    r.register('src', ValueSourceNode);
    r.register('wrap', WrapTransformNode);
    r.register('sink', makeCollectorSink([]));
  };

  it('reports every delivery by graph node id when trace is on', () => {
    const handle = interpret(chain, makeDeps(register), { trace: true });
    const events: INodeDeliveryEvent[] = [];
    // Attached after the synchronous run: the run's deliveries are replayed.
    handle.onDelivery(event => events.push(event));

    expect(
      events.map(({ sourceNodeId, sourcePortId, targetNodeId, targetPortId }) =>
        `${sourceNodeId}.${sourcePortId}->${targetNodeId}.${targetPortId}`,
      ),
    ).toEqual(['r1.Output->t1.Input', 't1.Output->w1.Input']);
    expect(events[0]?.message).toBe('hi');
    expect(events.every(event => typeof event.duration === 'number' && event.duration >= 0)).toBe(true);
    handle.dispose();
  });

  it('reports no deliveries and gives the flow no observer without trace', () => {
    const seen: IRuntimeFlowOptions[] = [];
    const deps = makeDeps(register);
    const handle = interpret(chain, {
      ...deps,
      createFlow: options => {
        seen.push(options);
        return deps.createFlow(options);
      },
    });
    const events: INodeDeliveryEvent[] = [];
    handle.onDelivery(event => events.push(event));

    expect(events).toEqual([]);
    expect(seen.map(options => options.observer)).toEqual([undefined]);
    handle.dispose();
  });

  it('reports a Writable handler failure through onError with its node id', () => {
    const failure = new Error('sink failed');
    const handle = interpret(
      { nodeList: [rNode('r1', 'src', 'x'), wNode('w1', 'bad')], connections: [edge('r1', 'w1')] },
      makeDeps(r => {
        r.register('src', ValueSourceNode);
        r.register('bad', makeThrowingSink(failure));
      }),
    );
    const errors: INodeErrorEvent[] = [];
    handle.onError(event => errors.push(event));

    expect(errors).toEqual([{ nodeId: 'w1', error: failure }]);
    handle.dispose();
  });

  it('still runs with a flow factory that takes no options', () => {
    const received: unknown[] = [];
    const handle = interpret(
      { nodeList: [rNode('r1', 'src', 'x'), wNode('w1', 'sink')], connections: [edge('r1', 'w1')] },
      {
        registry: makeDeps(r => {
          r.register('src', ValueSourceNode);
          r.register('sink', makeCollectorSink(received));
        }).registry,
        createFlow: (): IRuntimeFlow => new Flow(),
      },
      { trace: true },
    );
    expect(received).toEqual(['x']);
    handle.dispose();
  });

  it('stops delivering to a listener once its subscription is disposed', async () => {
    const handle = interpret(
      { nodeList: [rNode('r1', 'tick'), wNode('w1', 'sink')], connections: [edge('r1', 'w1')] },
      makeDeps(r => {
        r.register('tick', makeTeardownSource([], 5));
        r.register('sink', makeCollectorSink([]));
      }),
      { trace: true },
    );
    const disposed: INodeDeliveryEvent[] = [];
    const kept: INodeDeliveryEvent[] = [];
    const subscription = handle.onDelivery(event => disposed.push(event));
    handle.onDelivery(event => kept.push(event));
    await new Promise(resolve => setTimeout(resolve, 30));
    subscription.dispose();
    const atDispose = disposed.length;
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(atDispose).toBeGreaterThan(0);
    expect(disposed).toHaveLength(atDispose);
    expect(kept.length).toBeGreaterThan(atDispose);
    handle.dispose();
  });

  it('ignores what the flow reports about nodes outside the graph', async () => {
    const failure = new Error('unattributed');
    const stranger = new ValueSourceNode({
      nodeId: 'x', flowId: 'f', env: 'test', middleware: {}, config: {},
      signal: { observable: new Subject<void>().asObservable(), onStop: () => undefined },
    });
    const rethrown = new Promise<unknown>(resolve => {
      const original = globalThis.queueMicrotask;
      vi.spyOn(globalThis, 'queueMicrotask').mockImplementationOnce(task => {
        original(() => {
          try {
            task();
          } catch (error: unknown) {
            resolve(error);
          }
        });
      });
    });
    const handle = interpret(chain, {
      registry: makeDeps(register).registry,
      createFlow: options => ({
        run: () => {
          options.observer?.delivered?.({
            source: stranger, sourcePort: 'Output', target: stranger, targetPort: 'Input', message: 1, duration: 0,
          });
          options.onError?.(failure, null);
        },
      }),
    }, { trace: true });
    const events: INodeDeliveryEvent[] = [];
    const errors: INodeErrorEvent[] = [];
    handle.onDelivery(event => events.push(event));
    handle.onError(event => errors.push(event));

    expect(events).toEqual([]);
    expect(errors).toEqual([]);
    await expect(rethrown).resolves.toBe(failure);
    vi.restoreAllMocks();
    handle.dispose();
  });
});

describe('slicing', () => {
  it('runs a graph that loops forever without holding the thread, and stops it on dispose', async () => {
    const counter = { count: 0 };
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
      r.register('loop', makeLoopTransform(counter));
    });
    const graph: IGraph = {
      nodeList: [rNode('r1', 'src', 1), tNode('a', 'loop'), tNode('b', 'loop')],
      connections: [edge('r1', 'a'), edge('a', 'b'), edge('b', 'a')],
    };

    const handle = interpret(graph, deps, { slice: { budgetMs: 1 } });
    await new Promise(resolve => setTimeout(resolve, 30));
    const running = counter.count;
    expect(running).toBeGreaterThan(0);

    handle.dispose();
    const stopped = counter.count;
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(counter.count).toBe(stopped);
  });

  it('hands the flow no slicing unless asked', () => {
    const seen: IRuntimeFlowOptions[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
    });
    interpret({ nodeList: [rNode('r1', 'src', 'x')], connections: [] }, {
      ...deps,
      createFlow: options => {
        seen.push(options);
        return deps.createFlow(options);
      },
    }).dispose();
    expect(seen.map(options => options.slice)).toEqual([undefined]);
  });
});

describe('bounded connections (RFC 0001)', () => {
  /** A Readable that sends 1..5 at once. */
  function graphWith(capacity?: number): IGraph {
    const connection = edge('r1', 'w1');
    return {
      nodeList: [rNode('r1', 'burst'), wNode('w1', 'slow')],
      connections: [capacity === undefined ? connection : { ...connection, capacity }],
    };
  }

  async function run(capacity?: number) {
    const stats: { inFlight: number; maxInFlight: number; seen: unknown[] } = { inFlight: 0, maxInFlight: 0, seen: [] };
    class Burst extends ReadableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        Port.O('Output').attach(this);
      }
      override _read(o: PortAccessor): void {
        for (const value of [1, 2, 3, 4, 5]) {
          o('Output').send(value);
        }
      }
    }
    const handle = interpret(
      graphWith(capacity),
      makeDeps(r => {
        r.register('burst', Burst);
        r.register('slow', makeAsyncSink(stats));
      }),
    );
    await new Promise(resolve => setTimeout(resolve, 60));
    handle.dispose();
    return stats;
  }

  it('passes a connection\'s capacity to the runtime: one message at a time, in order', async () => {
    const stats = await run(2);
    expect(stats.maxInFlight).toBe(1);
    expect(stats.seen).toEqual([1, 2, 3, 4, 5]);
  });

  it('leaves an unbounded connection as it was: asynchronous work overlaps', async () => {
    const stats = await run();
    expect(stats.maxInFlight).toBe(5);
  });
});

describe('freezeMessages (RFC 0001)', () => {
  it('passes it to the flow only when asked', () => {
    const seen: IRuntimeFlowOptions[] = [];
    const deps = makeDeps(r => {
      r.register('src', ValueSourceNode);
    });
    const createFlow = (options: IRuntimeFlowOptions): IRuntimeFlow => {
      seen.push(options);
      return deps.createFlow(options);
    };
    const graph: IGraph = { nodeList: [rNode('r1', 'src', 'x')], connections: [] };
    interpret(graph, { ...deps, createFlow }, { freezeMessages: true }).dispose();
    interpret(graph, { ...deps, createFlow }).dispose();
    expect(seen.map(options => options.freezeMessages)).toEqual([true, undefined]);
  });
});

describe('end of stream and drops, traced (RFC 0001)', () => {
  it('reports ended inputs and finished nodes by graph id', () => {
    class Once extends ReadableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        Port.O('Output').attach(this);
      }
      override _read(o: PortAccessor): void {
        o('Output').send(1);
        o('Output').close();
      }
    }
    const handle = interpret(
      { nodeList: [rNode('r1', 'once'), wNode('w1', 'sink')], connections: [edge('r1', 'w1')] },
      makeDeps(r => {
        r.register('once', Once);
        r.register('sink', makeCollectorSink([]));
      }),
      { trace: true },
    );
    const log: string[] = [];
    handle.onEnded(event => log.push(`ended ${event.nodeId}.${event.portId}`));
    handle.onFinished(event => log.push(`finished ${event.nodeId}`));
    expect(log).toEqual(['ended w1.Input', 'finished r1', 'finished w1']);
    handle.dispose();
  });

  it('reports a message a full drop-oldest connection dropped', async () => {
    class Burst extends ReadableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        Port.O('Output').attach(this);
      }
      override _read(o: PortAccessor): void {
        for (const value of [1, 2, 3]) {
          o('Output').send(value);
        }
      }
    }
    const stats: { inFlight: number; maxInFlight: number; seen: unknown[] } = { inFlight: 0, maxInFlight: 0, seen: [] };
    const handle = interpret(
      {
        nodeList: [rNode('r1', 'burst'), wNode('w1', 'slow')],
        connections: [{ ...edge('r1', 'w1'), capacity: 1, overflow: 'drop-oldest' }],
      },
      makeDeps(r => {
        r.register('burst', Burst);
        r.register('slow', makeAsyncSink(stats));
      }),
      { trace: true },
    );
    const dropped: unknown[] = [];
    handle.onDropped(event => dropped.push([event.sourceNodeId, event.targetNodeId, event.message]));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(dropped).toEqual([['r1', 'w1', 2]]);
    expect(stats.seen).toEqual([1, 3]);
    handle.dispose();
  });
});
