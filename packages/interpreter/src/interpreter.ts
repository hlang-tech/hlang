/**
 * The interpreter entry point — hlang's interpreted execution semantics.
 *
 * `interpret` is the direct-evaluation counterpart to the compiler's AOT path:
 * it walks an `IGraph`, instantiates each node via the registry, wires
 * connections as `Output.O(id).connect(Input.I(id))`, subscribes error ports,
 * and calls `flow.run` for every Readable (R) root. It performs the same node
 * construction the compiler's codegen emits
 * (`packages/compiler/src/template/node/runtime.ts`), but by evaluating the
 * program in-process — no code generation, no file IO — so it runs anywhere
 * hlang runs (server, browser, tests, REPL, embedded editor).
 *
 * Direction is the load-bearing detail: in `IGraph` a connection's `Output` is
 * the upstream source (an O port) and `Input` is the downstream target (an I
 * port). The runtime enforces `O.connect(I)` and throws otherwise, so wiring
 * in the wrong direction fails loudly rather than silently mis-delivering.
 */

import { ReplaySubject, Subject } from 'rxjs';
import type { IGraph, INodeInfo } from './igraph';
import type { INodeRegistry } from './registry';
import type {
  FlowFactory,
  INodeConstructionOptions,
  IRuntimeNode,
  IStopSignal,
} from './runtime-contract';
import { ERROR_PORT_NAME } from './runtime-contract';
import type {
  IDisposable,
  INodeActivityEvent,
  IExecutionHandle,
  IInterpretOptions,
  INodeErrorEvent,
} from './types';

/** Dependencies the interpreter needs, injected for testability. */
export interface IInterpreterDeps {
  readonly registry: INodeRegistry;
  /** Produces a fresh runtime `Flow`. Injected so tests can supply fakes. */
  readonly createFlow: FlowFactory;
}

const DEFAULT_ENV = 'prod';

/** Deterministic-enough flow id without pulling in a uuid dependency. */
function generateFlowId(): string {
  return `flow-${Date.now().toString(36)}-${Math.round(
    (globalThis.performance?.now?.() ?? 0) * 1000,
  ).toString(36)}`;
}

/** Resolve the port id for an endpoint, defaulting to the canonical names. */
function portIdOf(
  endpoint: { readonly portConf?: { readonly id: string } },
  fallback: string,
): string {
  return endpoint.portConf?.id ?? fallback;
}

/**
 * Interpret and run a graph. Returns a handle to the running flow.
 *
 * @throws if the graph has no Readable (R) node, or references a `code` that
 * is not registered in the supplied registry.
 */
export function interpret(
  graph: IGraph,
  deps: IInterpreterDeps,
  options: IInterpretOptions = {},
): IExecutionHandle {
  const { registry, createFlow } = deps;
  const flowId = options.flowId ?? generateFlowId();
  const env = options.env ?? DEFAULT_ENV;
  const middleware = options.middleware ?? {};

  // Teardown machinery. `stop$` emits once when the flow is disposed; nodes
  // bind long-lived work to it (takeUntil / onStop). `teardowns` collects the
  // interpreter's own observing subscriptions so dispose cancels them too.
  const stop$ = new Subject<void>();
  const onStopCallbacks: (() => void)[] = [];
  const signal: IStopSignal = {
    observable: stop$.asObservable(),
    onStop(callback: () => void): void {
      onStopCallbacks.push(callback);
    },
  };
  const teardowns: (() => void)[] = [];

  // 1. Instantiate every node, keyed by its stable graph nodeId.
  const instances = new Map<string, IRuntimeNode>();
  const roots: IRuntimeNode[] = [];

  for (const info of graph.nodeList) {
    const ctor = registry.get(info.code);
    if (ctor === undefined) {
      throw new Error(
        `interpret: no node registered for code "${info.code}" (nodeId "${info.nodeId}").`,
      );
    }

    const construction: INodeConstructionOptions = {
      nodeId: info.nodeId,
      flowId,
      env,
      middleware,
      config: bizDataOf(info),
      signal,
    };
    const node = new ctor(construction);
    instances.set(info.nodeId, node);

    if (info.type === 'R') {
      roots.push(node);
    }
  }

  if (roots.length === 0) {
    // Mirrors the runtime, which requires at least one Readable root.
    throw new Error('interpret: graph has no Readable (R) node to run.');
  }

  // 2. Subscribe error ports BEFORE running so synchronous errors are captured.
  //    A ReplaySubject buffers errors emitted during `flow.run` so that
  //    listeners attached after `interpret` returns still observe them.
  const errorStream = new ReplaySubject<INodeErrorEvent>();
  for (const info of graph.nodeList) {
    if (info.type === 'W') {
      // Writable nodes have no error port.
      continue;
    }
    const node = instances.get(info.nodeId);
    if (node === undefined) {
      continue;
    }
    const errorPort = node.O(ERROR_PORT_NAME);
    const sub = errorPort.receive((error: unknown) => {
      errorStream.next({ nodeId: info.nodeId, error });
    });
    collectTeardown(teardowns, sub);
  }

  // 2b. Observe every wired output port for activity (the "living stream").
  //     Ports are multicast RxJS Subjects, so an extra observing subscription
  //     does not disturb real delivery. When a source emits on a connection, we
  //     surface activity for BOTH endpoints: the source's output port (it just
  //     produced) AND the target node (data just arrived) — so sinks (W nodes,
  //     which never emit) also light up. Error ports are skipped (onError).
  //     A bounded ReplaySubject buffers recent activity so a listener attached
  //     after `interpret` returns still sees the (synchronous) run's emissions.
  const activityStream = new ReplaySubject<INodeActivityEvent>(200);
  const observedPorts = new Set<string>();
  for (const connection of graph.connections) {
    const sourceNodeId = connection.Output.nodeId;
    const sourcePortId = portIdOf(connection.Output, 'Output');
    if (sourcePortId === ERROR_PORT_NAME) {
      continue;
    }
    const targetNodeId = connection.Input.nodeId;
    const targetPortId = portIdOf(connection.Input, 'Input');
    const key = `${sourceNodeId}@${sourcePortId}->${targetNodeId}@${targetPortId}`;
    if (observedPorts.has(key)) {
      continue;
    }
    const source = instances.get(sourceNodeId);
    if (source === undefined) {
      continue;
    }
    observedPorts.add(key);
    const sub = source.O(sourcePortId).receive(() => {
      activityStream.next({ nodeId: sourceNodeId, portId: sourcePortId });
      activityStream.next({ nodeId: targetNodeId, portId: targetPortId });
    });
    collectTeardown(teardowns, sub);
  }

  // 3. Wire connections: Output(source).O(id).connect(Input(target).I(id)).
  for (const connection of graph.connections) {
    const source = instances.get(connection.Output.nodeId);
    const target = instances.get(connection.Input.nodeId);
    if (source === undefined || target === undefined) {
      throw new Error(
        `interpret: connection references unknown node ` +
          `(source "${connection.Output.nodeId}", target "${connection.Input.nodeId}").`,
      );
    }
    const sourcePortId = portIdOf(connection.Output, 'Output');
    const targetPortId = portIdOf(connection.Input, 'Input');
    source.O(sourcePortId).connect(target.I(targetPortId));
  }

  // 4. Run every Readable root. The runtime subscribes downstream (W->T->R)
  //    and R pushes last, so data flows on demand once run.
  const flow = createFlow();
  for (const root of roots) {
    flow.run(root);
  }

  return createHandle(flowId, roots, instances, errorStream, activityStream, () => {
    // Stop: signal nodes to cancel long-lived work, run onStop callbacks, and
    // unsubscribe the interpreter's own port observations.
    stop$.next();
    stop$.complete();
    for (const cb of onStopCallbacks) {
      cb();
    }
    for (const teardown of teardowns) {
      teardown();
    }
  });
}

/** Extract the `bizData` config object passed to node construction. */
function bizDataOf(info: INodeInfo): Readonly<Record<string, unknown>> {
  const biz = info.bizData;
  if (biz === undefined) {
    return { params: {} };
  }
  return biz;
}

/** Something that can be torn down (an RxJS Subscription-like value). */
interface Unsubscribable {
  unsubscribe(): void;
}

function isUnsubscribable(value: unknown): value is Unsubscribable {
  return (
    typeof value === 'object' &&
    value !== null &&
    'unsubscribe' in value &&
    typeof value.unsubscribe === 'function'
  );
}

/** Collect a port `receive()` result for teardown if it is unsubscribable. */
function collectTeardown(teardowns: (() => void)[], sub: unknown): void {
  if (isUnsubscribable(sub)) {
    teardowns.push(() => {
      sub.unsubscribe();
    });
  }
}

/** Build the public execution handle over the constructed graph. */
function createHandle(
  flowId: string,
  roots: readonly IRuntimeNode[],
  instances: ReadonlyMap<string, IRuntimeNode>,
  errorStream: ReplaySubject<INodeErrorEvent>,
  activityStream: ReplaySubject<INodeActivityEvent>,
  teardown: () => void,
): IExecutionHandle {
  return {
    flowId,
    roots,
    getNode(nodeId: string): IRuntimeNode | undefined {
      return instances.get(nodeId);
    },
    onError(listener: (event: INodeErrorEvent) => void): IDisposable {
      const subscription = errorStream.subscribe(listener);
      return {
        dispose(): void {
          subscription.unsubscribe();
        },
      };
    },
    onActivity(listener: (event: INodeActivityEvent) => void): IDisposable {
      const subscription = activityStream.subscribe(listener);
      return {
        dispose(): void {
          subscription.unsubscribe();
        },
      };
    },
    dispose(): void {
      teardown();
      errorStream.complete();
      activityStream.complete();
    },
  };
}
