/**
 *
 * ------       ------
 *  Node  ---->  Node
 * ------       ------
 *
 */
import type Flow from '../base/flow';
import type Port from '../base/port';
import { ERROR_PORT_NAME, IDENTITY, NODE_ID_PREFIX, STREAM_TYPE } from '../type';
import type { NodeKind } from '../type';
import { uuid } from '../utils';

/** Resolves one of a node's ports by name; throws if the node has no such port. */
export type PortAccessor = (name: string) => Port;

/** What a node is constructed with. A node declares its own shape as a type argument. */
export type NodeOptions = Readonly<Record<string, unknown>>;

/** A node's ports, by direction and name. */
class PortMap {
  private readonly ports: Record<STREAM_TYPE, Record<string, Port>> = {
    [STREAM_TYPE.I]: {},
    [STREAM_TYPE.O]: {},
  };

  /** Every port of one direction, by name. */
  get(type: STREAM_TYPE): Readonly<Record<string, Port>> {
    return this.ports[type];
  }

  find(type: STREAM_TYPE, name: string): Port | undefined {
    return Object.prototype.hasOwnProperty.call(this.ports[type], name) ? this.ports[type][name] : undefined;
  }

  set(port: Port): void {
    this.ports[port.type][port.name] = port;
  }
}

/**
 * The base of the three node kinds. Subclass `ReadableNode`, `TransformNode`
 * or `WriteableNode`; `TOptions` is the shape of the options the node is
 * constructed with.
 */
export default abstract class Node<TOptions extends object = NodeOptions> {
  abstract readonly type: NodeKind;
  readonly id: string = `${NODE_ID_PREFIX}-${uuid.create()}`;
  readonly portMap = new PortMap();
  isRunning = false;
  flow: Flow | null = null;
  readonly identity: symbol = IDENTITY.NODE;
  opts: TOptions;

  /** Resolves an input port. Bound to the node, so it can be passed around as `$i`. */
  readonly I: PortAccessor = (name) => this.port(STREAM_TYPE.I, name);

  /** Resolves an output port. Bound to the node, so it can be passed around as `$o`. */
  readonly O: PortAccessor = (name) => this.port(STREAM_TYPE.O, name);

  constructor(opts: TOptions) {
    this.opts = opts;
  }

  /** Runs `start` the first time it is called and never again. */
  executeOnce(start: () => void): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    start();
  }

  /** The error output (`@node/error`); Readable and Transform nodes have one. */
  E(): Port | undefined {
    return this.portMap.find(STREAM_TYPE.O, ERROR_PORT_NAME);
  }

  attach(flow: Flow): void {
    this.flow = flow;
  }

  attachPort(port: Port): void {
    this.portMap.set(port);
  }

  private port(type: STREAM_TYPE, name: string): Port {
    const port = this.portMap.find(type, name);
    if (port === undefined) {
      throw new Error(`Node ${this.id} has no ${type === STREAM_TYPE.I ? 'input' : 'output'} port "${name}".`);
    }
    return port;
  }
}
