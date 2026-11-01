/**
 * Strict type contract for the `@hlang-org/runtime` boundary.
 *
 * The runtime package ships permissive declarations (its compiled `.d.ts`
 * is full of `any`). This interpreter is a zero-`any` package, so we do NOT
 * consume the runtime's loose types directly. Instead we describe the exact,
 * minimal surface we rely on as strict interfaces here, and adapt the runtime
 * through this single controlled boundary (see `runtime-adapter.ts`).
 *
 * Every shape below was verified against the runtime source:
 * - packages/runtime/src/base/port.ts
 * - packages/runtime/src/base/flow.ts
 * - packages/runtime/src/node/{node,readable,transform,writeable}.ts
 * - packages/runtime/src/type/index.ts
 */

import type { Observable } from 'rxjs';

/** Stream direction of a port. Mirrors runtime `STREAM_TYPE`. */
export type StreamType = 'I' | 'O';

/**
 * A runtime port. Ports are RxJS `Subject`s under the hood: `send` is `next`,
 * `receive` is `subscribe`. We only depend on the wiring + messaging surface.
 */
export interface IRuntimePort {
  readonly name: string;
  readonly type: string;
  /** Push a message downstream (RxJS `next`). */
  send(msg: unknown): void;
  /**
   * Subscribe to messages on this port (RxJS `subscribe`).
   * The returned value is an RxJS `Subscription`; we treat it opaquely.
   */
  receive(next: (msg: unknown) => void): unknown;
  /** Wire this Output port to a downstream Input port. Throws unless O -> I. */
  connect(port: IRuntimePort): IRuntimePort;
}

/**
 * A runtime node instance (R, T, or W). Nodes expose `I(name)` / `O(name)`
 * accessors that resolve a previously attached port by name.
 */
export interface IRuntimeNode {
  readonly id: string;
  /** Node kind symbol from runtime `NODE_TYPE`. Compared by reference. */
  readonly type: symbol;
  /** Resolve an Input port by name. */
  I(name: string): IRuntimePort;
  /** Resolve an Output port by name. */
  O(name: string): IRuntimePort;
  /**
   * Resolve the error Output port (`@node/error`). Readable and Transform nodes
   * have one; a Writable node has none and returns `undefined`.
   */
  E(): IRuntimePort | undefined;
}

/**
 * A teardown signal handed to nodes so they can cancel long-lived work (timers,
 * intervals, subscriptions) when the flow is stopped. hlang nodes are
 * RxJS-native, so a streaming source binds its subscription to the flow's
 * lifetime with `interval(...).pipe(takeUntil(stop.observable))`. Nodes that do
 * no long-lived work can ignore it.
 */
export interface IStopSignal {
  /** Emits once (then completes) when the flow is stopped. RxJS-native. */
  readonly observable: Observable<void>;
  /** Register a plain callback to run on stop (non-RxJS nodes). */
  onStop(callback: () => void): void;
}

/** Constructor options passed to every node, mirroring the runtime contract. */
export interface INodeConstructionOptions {
  readonly nodeId: string;
  readonly flowId: string;
  readonly env: string;
  readonly middleware: Readonly<Record<string, unknown>>;
  readonly config: Readonly<Record<string, unknown>>;
  /** Fires when the flow is stopped; use to cancel long-lived work. */
  readonly signal: IStopSignal;
}

/**
 * A node class constructor. The registry maps an hlang `code` to one of these.
 * Concrete node classes extend the runtime's `ReadableNode` / `TransformNode`
 * / `WritableNode`.
 */
export type NodeConstructor = new (opts: INodeConstructionOptions) => IRuntimeNode;

/** One message delivered on one connection, as the runtime reports it. */
export interface IRuntimeDeliveryEvent {
  readonly source: IRuntimeNode;
  readonly sourcePort: string;
  readonly target: IRuntimeNode;
  readonly targetPort: string;
  readonly message: unknown;
  /** How long the target's handlers took, in milliseconds. */
  readonly duration: number;
}

/** Watches a runtime flow. Mirrors the runtime's `FlowObserver`. */
export interface IRuntimeFlowObserver {
  readonly delivered?: (event: IRuntimeDeliveryEvent) => void;
}

/** What the interpreter asks of the flow it creates. Mirrors the runtime's `FlowOptions`. */
export interface IRuntimeFlowOptions {
  /** Receives a failure the graph cannot carry, such as a Writable's handler throwing. */
  readonly onError?: (error: unknown, node: IRuntimeNode | null) => void;
  /** Present when the run is traced. */
  readonly observer?: IRuntimeFlowObserver;
}

/** A runtime `Flow`. `run` must be called with a Readable (R) root node. */
export interface IRuntimeFlow {
  run(rootNode: IRuntimeNode): void;
  /**
   * Ends every node the flow started: cuts its connections, runs the nodes'
   * teardowns and completes their ports. `@hlang-org/runtime` 2.1 and later
   * provide it; the interpreter calls it, when present, on `dispose`.
   */
  dispose?(): void;
}

/**
 * Produces a fresh `Flow` from the options the interpreter passes, typically
 * `options => new Flow(options)`. A factory that ignores them still runs the
 * graph, without tracing and without a node id on Writable failures.
 */
export type FlowFactory = (options: IRuntimeFlowOptions) => IRuntimeFlow;

// Node kinds and the error port name are defined once, in the IR.
export { ERROR_PORT_NAME } from '@hlang-org/ir';
export type { NodeKind } from '@hlang-org/ir';
