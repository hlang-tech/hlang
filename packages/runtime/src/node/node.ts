/**
 *
 * ------       ------
 *  Node  ---->  Node
 * ------       ------
 *
 */
import type Port from '../base/port';
import { ERROR_PORT_NAME, IDENTITY, NODE_ID_PREFIX, STREAM_TYPE } from '../type';
import type { NodeKind } from '../type';
import { uuid } from '../utils';

/** Resolves one of a node's ports by name; throws if the node has no such port. */
export type PortAccessor = (name: string) => Port;

/** What a node is constructed with. A node declares its own shape as a type argument. */
export type NodeOptions = Readonly<Record<string, unknown>>;

/**
 * Engine access to a node's private state, for the modules that build and run
 * a graph. Set once by the class below and never exported from the package.
 */
export let nodeInternals: {
  /** Every port of one direction, in the order they were attached. */
  readonly portsOf: (node: Node<object>, type: STREAM_TYPE) => readonly Port[];
  /** Registers `port` on `node` under its name; `Port#attach` calls this. */
  readonly attachPort: (node: Node<object>, port: Port) => void;
  /** Runs `start` the first time it is called for `node`, never again. */
  readonly startOnce: (node: Node<object>, start: () => void) => void;
};

/**
 * The base of the three node kinds. Subclass `ReadableNode`, `TransformNode`
 * or `WriteableNode`; `TOptions` is the shape of the options the node is
 * constructed with.
 *
 * A node holds its own options and ports and nothing else: it cannot reach the
 * flow that runs it or any other node, so the only thing nodes share is the
 * messages on their connections.
 */
export default abstract class Node<TOptions extends object = NodeOptions> {
  static {
    nodeInternals = {
      portsOf: (node, type) => [...node.#ports[type].values()],
      attachPort: (node, port) => {
        node.#ports[port.type].set(port.name, port);
      },
      startOnce: (node, start) => {
        if (node.#started) {
          return;
        }
        node.#started = true;
        start();
      },
    };
  }

  abstract readonly type: NodeKind;
  readonly id: string = `${NODE_ID_PREFIX}-${uuid.create()}`;
  readonly identity: symbol = IDENTITY.NODE;
  opts: TOptions;

  readonly #ports: Record<STREAM_TYPE, Map<string, Port>> = {
    [STREAM_TYPE.I]: new Map(),
    [STREAM_TYPE.O]: new Map(),
  };
  #started = false;

  /** Resolves an input port. Bound to the node, so it can be passed around as `$i`. */
  readonly I: PortAccessor = (name) => this.#port(STREAM_TYPE.I, name);

  /** Resolves an output port. Bound to the node, so it can be passed around as `$o`. */
  readonly O: PortAccessor = (name) => this.#port(STREAM_TYPE.O, name);

  constructor(opts: TOptions) {
    this.opts = opts;
  }

  /** The error output (`@node/error`); Readable and Transform nodes have one. */
  E(): Port | undefined {
    return this.#ports[STREAM_TYPE.O].get(ERROR_PORT_NAME);
  }

  #port(type: STREAM_TYPE, name: string): Port {
    const port = this.#ports[type].get(name);
    if (port === undefined) {
      throw new Error(`Node ${this.id} has no ${type === STREAM_TYPE.I ? 'input' : 'output'} port "${name}".`);
    }
    return port;
  }
}
