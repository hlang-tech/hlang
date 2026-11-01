import Port from '../base/port';
import { ERROR_PORT_NAME, NODE_TYPE } from '../type';
import Node from './node';
import type { NodeOptions, PortAccessor } from './node';

/** A source: it has outputs and an error output, and starts the flow in `_read`. */
export default class ReadableNode<TOptions extends object = NodeOptions> extends Node<TOptions> {
  readonly type: typeof NODE_TYPE.READABLE = NODE_TYPE.READABLE;

  /** The error output, `@node/error`. */
  private readonly errorPort = Port.O(ERROR_PORT_NAME);

  constructor(opts: TOptions) {
    super(opts);
    this.errorPort.attach(this);
  }

  /** Sends `error` on the error output. */
  throw(error: unknown): void {
    this.E().send(error);
  }

  override E(): Port {
    return this.errorPort;
  }

  /** Called once when the flow runs; send on the outputs through `$o`. */
  _read(_$o: PortAccessor): void {
    // Nothing to read by default.
  }
}
