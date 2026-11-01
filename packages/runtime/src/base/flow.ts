import type { Subscription } from 'rxjs';
import build from '../core/build';
import { deliveries } from '../core/delivery';
import type { AnyNode, Teardown } from '../node';
import { nodeInternals } from '../node/node';
import { NODE_TYPE, STREAM_TYPE } from '../type';
import type { IPortDesc } from '../type';
import type Port from './port';
import { portInternals, reportFailure } from './port';
import type { FailureHandler } from './port';

/** How a host creates a flow. */
export interface FlowOptions {
  /**
   * Receives a failure the graph cannot carry: a handler throwing on a
   * Writable's input (it has no error port), an observer of a port throwing,
   * or a node's teardown throwing. Without it, such a failure is rethrown
   * asynchronously, so it is never lost. A Transform's failures go to its own
   * error port either way.
   */
  readonly onError?: FailureHandler;
}

/** A node this flow started, and the teardown its start returned, if any. */
interface Started {
  readonly node: AnyNode;
  readonly teardown: Teardown | undefined;
}

/**
 * Runs a graph of nodes from a Readable root. A flow belongs to its host: no
 * node can reach it, and its record of wired connections is private.
 *
 * A flow owns the nodes it starts. `dispose` ends them: it cuts the flow's
 * connections, runs their teardowns and completes their ports.
 */
export default class Flow {
  readonly #onError: FailureHandler | undefined;
  /** The connections this flow has wired, by output and input port id. */
  readonly #wired = new Set<string>();
  /** The subscriptions that carry those connections. */
  readonly #connections: Subscription[] = [];
  /** The nodes this flow started, in the order it started them. */
  readonly #started: Started[] = [];
  #disposed = false;

  constructor(options: FlowOptions = {}) {
    this.#onError = options.onError;
  }

  /** Whether `dispose` has been called. */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Builds the graph downstream of `root`, wires every connection through the
   * delivery queue, and starts each node once: Writables first, then
   * Transforms, then the root, so every receiver exists before a source sends.
   */
  run(root: AnyNode): void {
    if (this.#disposed) {
      throw new Error('Flow has been disposed.');
    }
    if (root.type !== NODE_TYPE.READABLE) {
      throw new Error('Flow must run with a READABLE node.');
    }
    const graph = build(root);
    const nodes: readonly AnyNode[] = [...graph.writable, ...graph.transform, ...graph.readable];
    for (const node of nodes) {
      for (const port of this.#portsOf(node)) {
        portInternals.setFailureHandler(port, this.#onError);
      }
    }

    for (const node of graph.writable) {
      this.#start(node, () => node._write(node.I));
    }
    for (const node of graph.transform) {
      this.#wire(graph.connections.get(node.id) ?? []);
      this.#start(node, () => node._transform(node.I, node.O));
    }
    for (const node of graph.readable) {
      this.#wire(graph.connections.get(node.id) ?? []);
      this.#start(node, () => node._read(node.O));
    }
  }

  /**
   * Ends every node this flow started. In order: the flow's connections are
   * cut, so nothing more is delivered (messages already queued are dropped);
   * each node's teardown runs, the last started first, with a failing one
   * reported like any other failure while the rest still run; then the nodes'
   * ports complete, which ends every subscription made on them, and later
   * sends are dropped. Nodes another flow started are left running.
   *
   * Safe to call more than once, and from inside a delivery. A disposed flow
   * cannot run again.
   */
  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    for (const connection of this.#connections.splice(0)) {
      connection.unsubscribe();
    }
    const started = this.#started.splice(0).reverse();
    for (const { node, teardown } of started) {
      if (teardown === undefined) {
        continue;
      }
      try {
        teardown();
      } catch (error: unknown) {
        reportFailure(this.#onError, error, node);
      }
    }
    for (const { node } of started) {
      for (const port of this.#portsOf(node)) {
        portInternals.close(port);
      }
    }
  }

  /** Starts `node` unless it has already started, and records what it returns. */
  #start(node: AnyNode, start: () => Teardown | void): void {
    let teardown: Teardown | undefined;
    const ran = nodeInternals.startOnce(node, () => {
      teardown = start() ?? undefined;
    });
    if (ran) {
      this.#started.push({ node, teardown });
    }
  }

  #portsOf(node: AnyNode): readonly Port[] {
    return [...nodeInternals.portsOf(node, STREAM_TYPE.I), ...nodeInternals.portsOf(node, STREAM_TYPE.O)];
  }

  /** Subscribes each connection once: what its output sends is delivered to its input. */
  #wire(connections: readonly IPortDesc[]): void {
    for (const { src, dst } of connections) {
      const key = `${src.id}@${dst.id}`;
      if (this.#wired.has(key)) {
        continue;
      }
      this.#wired.add(key);
      this.#connections.push(
        src.receive((message) => {
          deliveries.deliver(dst, message);
        }),
      );
    }
  }
}
