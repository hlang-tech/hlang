/**
 * Public API contract for the interpreter.
 *
 * The interpreter evaluates an `IGraph` into a live runtime object graph and
 * runs it in-process. Runtime signals (per-node errors emitted on the
 * `@node/error` port) are surfaced through plain callbacks so that consumers
 * never take a direct dependency on RxJS — the reactive machinery stays behind
 * this boundary.
 */

import type { IRuntimeNode } from './runtime-contract';

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
  /** Subscribe to errors emitted by any node's `@node/error` port. */
  onError(listener: (event: INodeErrorEvent) => void): IDisposable;
  /**
   * Subscribe to output-port emissions across all nodes — the "living stream"
   * signal. Fires each time a node pushes a message on a non-error output port.
   */
  onActivity(listener: (event: INodeActivityEvent) => void): IDisposable;
}
