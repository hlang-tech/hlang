import Port from '../base/port';
import { ERROR_PORT_NAME, NODE_TYPE } from '../type';
import Node from './node';
import type { NodeOptions, PortAccessor, Teardown } from './node';

/** A transform: it receives on inputs and sends on outputs and an error output. */
export default class TransformNode<TOptions extends object = NodeOptions> extends Node<TOptions> {
  readonly type: typeof NODE_TYPE.TRANSFORM = NODE_TYPE.TRANSFORM;

  /** The error output, `@node/error`. */
  readonly #errorPort = Port.O(ERROR_PORT_NAME);

  /**
   * Whether the node closes its outputs once all its inputs have ended
   * (RFC 0001), so the end of a stream travels on. A node that keeps
   * producing after its inputs end (a timer) overrides it with `false` and
   * closes its outputs itself.
   */
  readonly closesWithInputs: boolean = true;

  constructor(opts: TOptions) {
    super(opts);
    this.#errorPort.attach(this);
  }

  /** Sends `error` on the error output. */
  throw(error: unknown): void {
    this.E().send(error);
  }

  override E(): Port {
    return this.#errorPort;
  }

  /** Called once when the flow runs; receive through `$i` and send through `$o`. It may return a teardown, run when the flow is disposed. */
  _transform(_$i: PortAccessor, _$o: PortAccessor): Teardown | void {
    // Nothing to transform by default.
  }
}
