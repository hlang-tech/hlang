/**
 * Public API contract for the interpreter.
 *
 * The interpreter evaluates an `IGraph` into a live runtime object graph and
 * runs it in-process. Runtime signals (per-node errors emitted on the
 * `@node/error` port) are surfaced through plain callbacks so that consumers
 * never take a direct dependency on RxJS — the reactive machinery stays behind
 * this boundary.
 */

import type { IRuntimeNode, IRuntimeSliceOptions } from './runtime-contract';

/** A cancellable subscription handle. */
export interface IDisposable {
  dispose(): void;
}

/** An error surfaced from a node's `@node/error` port during execution. */
export interface INodeErrorEvent {
  /** Stable `nodeId` from the graph. */
  readonly nodeId: string;
  /** The error payload the node sent on its error port. */
  readonly error: unknown;
}

/**
 * A node emitting on one of its output ports during execution — the signal
 * behind the editor's "living stream" visuals. Fires each time a node pushes a
 * message on a non-error output port.
 */
export interface INodeActivityEvent {
  /** Stable `nodeId` from the graph. */
  readonly nodeId: string;
  /** The output port name the message was sent on. */
  readonly portId: string;
}

/** A message delivered on one connection, reported when the run is traced. */
export interface INodeDeliveryEvent {
  /** The sending node's graph `nodeId` and output port. */
  readonly sourceNodeId: string;
  readonly sourcePortId: string;
  /** The receiving node's graph `nodeId` and input port. */
  readonly targetNodeId: string;
  readonly targetPortId: string;
  readonly message: unknown;
  /** How long the receiving node's handlers took, in milliseconds. */
  readonly duration: number;
}

/** An input that has ended, reported when the run is traced (RFC 0001). */
export interface INodeEndedEvent {
  readonly nodeId: string;
  readonly portId: string;
}

/** A node that has finished, reported when the run is traced (RFC 0001). */
export interface INodeFinishedEvent {
  readonly nodeId: string;
}

/** A message a full `drop-oldest` connection dropped, reported when the run is traced (RFC 0001). */
export interface INodeDroppedEvent {
  readonly sourceNodeId: string;
  readonly sourcePortId: string;
  readonly targetNodeId: string;
  readonly targetPortId: string;
  readonly message: unknown;
}

/** Options controlling interpretation. */
export interface IInterpretOptions {
  /**
   * Flow identifier threaded into each node's construction options and used to
   * scope the run. Defaults to a generated value when omitted.
   */
  readonly flowId?: string;
  /** Execution environment label passed to nodes. Defaults to `'prod'`. */
  readonly env?: string;
  /**
   * Middleware object passed verbatim to every node (e.g. `{ logger }`).
   * Nodes read their own middleware keys.
   */
  readonly middleware?: Readonly<Record<string, unknown>>;
  /**
   * Report every delivery through `onDelivery`, with its timing. Off by
   * default: an untraced run reads no clock and records nothing per message.
   */
  readonly trace?: boolean;
  /**
   * Share the thread: the flow delivers in slices of at most `budgetMs` and
   * yields to the rest of the program between them, so a graph that loops
   * forever with no asynchronous step (feedback between transforms is legal)
   * neither freezes a page nor starves a server, and `dispose` can stop it.
   * Off by default: an unsliced run delivers everything a send causes before
   * the send returns, which is fastest. Pass `{}` for the defaults.
   */
  readonly slice?: IRuntimeSliceOptions;
  /**
   * Deep-freeze the plain data in each message as it is sent, so a node that
   * mutates what it received fails at once (RFC 0001). Off by default.
   */
  readonly freezeMessages?: boolean;
}

/**
 * A handle to a running interpretation. Lets callers observe node errors and
 * introspect the constructed graph, and tear the run down.
 */
export interface IExecutionHandle extends IDisposable {
  /** The flow id this run was scoped with. */
  readonly flowId: string;
  /** The Readable (R) root nodes that were `flow.run`. At least one. */
  readonly roots: readonly IRuntimeNode[];
  /** Resolve a constructed node instance by its graph `nodeId`. */
  getNode(nodeId: string): IRuntimeNode | undefined;
  /**
   * Subscribe to node errors: what any node sends on its `@node/error` port,
   * and a Writable node's handler throwing (it has no error port).
   */
  onError(listener: (event: INodeErrorEvent) => void): IDisposable;
  /**
   * Subscribe to output-port emissions across all nodes — the "living stream"
   * signal. Fires each time a node pushes a message on a non-error output port.
   */
  onActivity(listener: (event: INodeActivityEvent) => void): IDisposable;
  /**
   * Subscribe to every delivery, with its timing, when the run is traced
   * (`trace: true`); an untraced run reports none. Recent deliveries are
   * replayed to a listener attached after `interpret` returns.
   */
  onDelivery(listener: (event: INodeDeliveryEvent) => void): IDisposable;
  /** With `trace: true`: each input that ends (RFC 0001), replayed like deliveries. */
  onEnded(listener: (event: INodeEndedEvent) => void): IDisposable;
  /** With `trace: true`: each node that finishes (RFC 0001), replayed like deliveries. */
  onFinished(listener: (event: INodeFinishedEvent) => void): IDisposable;
  /** With `trace: true`: each message a full `drop-oldest` connection drops, replayed like deliveries. */
  onDropped(listener: (event: INodeDroppedEvent) => void): IDisposable;
}
