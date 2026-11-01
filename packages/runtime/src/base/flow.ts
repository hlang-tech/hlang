import build from '../core/build';
import { deliveries } from '../core/delivery';
import type { AnyNode } from '../node';
import { nodeInternals } from '../node/node';
import { NODE_TYPE, STREAM_TYPE } from '../type';
import type { IPortDesc } from '../type';
import { portInternals } from './port';
import type { FailureHandler } from './port';

/** How a host creates a flow. */
export interface FlowOptions {
  /**
   * Receives a failure the graph cannot carry: a handler throwing on a
   * Writable's input (it has no error port), or an observer of a port throwing.
   * Without it, such a failure is rethrown asynchronously, so it is never lost.
   * A Transform's failures go to its own error port either way.
   */
  readonly onError?: FailureHandler;
}

/**
 * Runs a graph of nodes from a Readable root. A flow belongs to its host: no
 * node can reach it, and its record of wired connections is private.
 */
export default class Flow {
  readonly #onError: FailureHandler | undefined;
  /** The connections this flow has wired, by output and input port id. */
  readonly #wired = new Set<string>();

  constructor(options: FlowOptions = {}) {
    this.#onError = options.onError;
  }

  /**
   * Builds the graph downstream of `root`, wires every connection through the
   * delivery queue, and starts each node once: Writables first, then
   * Transforms, then the root, so every receiver exists before a source sends.
   */
  run(root: AnyNode): void {
    if (root.type !== NODE_TYPE.READABLE) {
      throw new Error('Flow must run with a READABLE node.');
    }
    const graph = build(root);
    const nodes: readonly AnyNode[] = [...graph.writable, ...graph.transform, ...graph.readable];
    for (const node of nodes) {
      for (const port of [...nodeInternals.portsOf(node, STREAM_TYPE.I), ...nodeInternals.portsOf(node, STREAM_TYPE.O)]) {
        portInternals.setFailureHandler(port, this.#onError);
      }
    }

    for (const node of graph.writable) {
      nodeInternals.startOnce(node, () => {
        node._write(node.I);
      });
    }
    for (const node of graph.transform) {
      this.#wire(graph.connections.get(node.id) ?? []);
      nodeInternals.startOnce(node, () => {
        node._transform(node.I, node.O);
      });
    }
    for (const node of graph.readable) {
      this.#wire(graph.connections.get(node.id) ?? []);
      nodeInternals.startOnce(node, () => {
        node._read(node.O);
      });
    }
  }

  /** Subscribes each connection once: what its output sends is delivered to its input. */
  #wire(connections: readonly IPortDesc[]): void {
    for (const { src, dst } of connections) {
      const key = `${src.id}@${dst.id}`;
      if (this.#wired.has(key)) {
        continue;
      }
      this.#wired.add(key);
      src.receive((message) => {
        deliveries.deliver(dst, message);
      });
    }
  }
}
