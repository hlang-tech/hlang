/**
 * The interpreter entry point — hlang's interpreted execution semantics.
 *
 * `interpret` executes the `ExecutionPlan` produced by `planGraph` from
 * `@hlang-org/ir`: it constructs each node through the registry, wires every
 * connection as `source.O(id).connect(target.I(id))`, subscribes error ports,
 * and calls `flow.run` for every Readable (R) root. `@hlang-org/compiler`
 * emits the same steps as an ES module from the same plan. The interpreter
 * performs them in-process — no code generation, no file IO — so it runs
 * anywhere hlang runs (server, browser, tests, REPL, embedded editor).
 */

import { ReplaySubject, Subject } from 'rxjs';
import { planGraph, ERROR_PORT_NAME } from '@hlang-org/ir';
import type { IGraph } from '@hlang-org/ir';
import type { INodeRegistry } from './registry';
import type {
  FlowFactory,
  INodeConstructionOptions,
  IRuntimeFlowOptions,
  IRuntimeNode,
  IStopSignal,
} from './runtime-contract';
import type {
  IDisposable,
  INodeActivityEvent,
  INodeDeliveryEvent,
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

/** How many recent activity events a listener attached after the run still sees. */
const ACTIVITY_REPLAY = 200;
/** How many recent deliveries a listener attached after the run still sees. */
const DELIVERY_REPLAY = 500;

/** Deterministic-enough flow id without pulling in a uuid dependency. */
function generateFlowId(): string {
  return `flow-${Date.now().toString(36)}-${Math.round(
    (globalThis.performance?.now?.() ?? 0) * 1000,
  ).toString(36)}`;
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
  // Middleware carries the host's services to every node. Nodes get a frozen
  // copy: they can use the services but cannot add to it to share state, and
  // the host's own object is left as it is.
  const middleware: Readonly<Record<string, unknown>> = Object.freeze({ ...(options.middleware ?? {}) });

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

  // 0. Validate and lower the graph. The plan is shared with the compiler, so
  //    both backends apply the same rules and raise the same `GraphError`s.
  const plan = planGraph(graph);

  // 1. Instantiate every node, keyed by its stable graph nodeId.
  const instances = new Map<string, IRuntimeNode>();
  for (const planned of plan.nodes) {
    const ctor = registry.get(planned.code);
    if (ctor === undefined) {
      throw new Error(
        `interpret: no node registered for code "${planned.code}" (nodeId "${planned.nodeId}").`,
      );
    }
    const construction: INodeConstructionOptions = {
      nodeId: planned.nodeId,
      flowId,
      env,
      middleware,
      config: planned.config,
      signal,
    };
    instances.set(planned.nodeId, new ctor(construction));
  }
  const nodeOf = (nodeId: string): IRuntimeNode => {
    const instance = instances.get(nodeId);
    if (instance === undefined) {
      // Unreachable: planGraph guarantees every referenced node exists.
      throw new Error(`interpret: node "${nodeId}" was not constructed.`);
    }
    return instance;
  };
  const roots = plan.roots.map(nodeOf);
  const nodeIdOf = new Map<IRuntimeNode, string>();
  for (const [nodeId, instance] of instances) {
    nodeIdOf.set(instance, nodeId);
  }

  // 2. Subscribe error ports BEFORE running so synchronous errors are captured.
  //    A ReplaySubject buffers errors emitted during `flow.run` so that
  //    listeners attached after `interpret` returns still observe them.
  const errorStream = new ReplaySubject<INodeErrorEvent>();
  for (const planned of plan.nodes) {
    if (planned.kind === 'W') {
      // Writable nodes have no error port.
      continue;
    }
    const sub = nodeOf(planned.nodeId)
      .O(ERROR_PORT_NAME)
      .receive((error: unknown) => {
        errorStream.next({ nodeId: planned.nodeId, error });
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
  const activityStream = new ReplaySubject<INodeActivityEvent>(ACTIVITY_REPLAY);
  const observed = new Set<string>();
  for (const { source, target } of plan.connections) {
    if (source.portId === ERROR_PORT_NAME) {
      continue;
    }
    const key = `${source.nodeId}@${source.portId}->${target.nodeId}@${target.portId}`;
    if (observed.has(key)) {
      continue;
    }
    observed.add(key);
    const sub = nodeOf(source.nodeId)
      .O(source.portId)
      .receive(() => {
        activityStream.next({ nodeId: source.nodeId, portId: source.portId });
        activityStream.next({ nodeId: target.nodeId, portId: target.portId });
      });
    collectTeardown(teardowns, sub);
  }

  // 3. Wire connections: source.O(portId).connect(target.I(portId)).
  //    A bounded connection passes its capacity and overflow (RFC 0001).
  for (const { source, target, capacity, overflow } of plan.connections) {
    const input = nodeOf(target.nodeId).I(target.portId);
    const output = nodeOf(source.nodeId).O(source.portId);
    if (capacity === undefined) {
      output.connect(input);
    } else {
      output.connect(input, overflow === undefined ? { capacity } : { capacity, overflow });
    }
  }

  // 4. Run every Readable root. The runtime subscribes downstream (W->T->R)
  //    and R pushes last, so data flows on demand once run.
  //    The flow reports a Writable's handler failure (it has no error port)
  //    through `onError`, and, when the run is traced, every delivery.
  const deliveryStream = new ReplaySubject<INodeDeliveryEvent>(DELIVERY_REPLAY);
  const flowOptions: IRuntimeFlowOptions = {
    onError: (error, node) => {
      const nodeId = node === null ? undefined : nodeIdOf.get(node);
      if (nodeId === undefined) {
        // Not a node of this graph: rethrow asynchronously, as the runtime
        // does without a handler, so the failure is never lost.
        queueMicrotask(() => {
          throw error;
        });
        return;
      }
      errorStream.next({ nodeId, error });
    },
    ...(options.slice === undefined ? {} : { slice: options.slice }),
    ...(options.trace === true
      ? {
          observer: {
            delivered: ({ source, sourcePort, target, targetPort, message, duration }) => {
              const sourceNodeId = nodeIdOf.get(source);
              const targetNodeId = nodeIdOf.get(target);
              if (sourceNodeId !== undefined && targetNodeId !== undefined) {
                deliveryStream.next({
                  sourceNodeId,
                  sourcePortId: sourcePort,
                  targetNodeId,
                  targetPortId: targetPort,
                  message,
                  duration,
                });
              }
            },
          },
        }
      : {}),
  };
  const flow = createFlow(flowOptions);
  for (const root of roots) {
    flow.run(root);
  }

  return createHandle(flowId, roots, instances, { errorStream, activityStream, deliveryStream }, () => {
    // Stop: signal nodes to cancel long-lived work, run onStop callbacks,
    // dispose the runtime flow (node teardowns, closed ports), and unsubscribe
    // the interpreter's own port observations.
    stop$.next();
    stop$.complete();
    for (const cb of onStopCallbacks) {
      cb();
    }
    flow.dispose?.();
    for (const teardown of teardowns) {
      teardown();
    }
  });
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
  streams: {
    readonly errorStream: ReplaySubject<INodeErrorEvent>;
    readonly activityStream: ReplaySubject<INodeActivityEvent>;
    readonly deliveryStream: ReplaySubject<INodeDeliveryEvent>;
  },
  teardown: () => void,
): IExecutionHandle {
  const { errorStream, activityStream, deliveryStream } = streams;
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
    onDelivery(listener: (event: INodeDeliveryEvent) => void): IDisposable {
      const subscription = deliveryStream.subscribe(listener);
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
      deliveryStream.complete();
    },
  };
}
