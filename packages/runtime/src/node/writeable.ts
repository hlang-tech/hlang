import { NODE_TYPE } from '../type';
import Node from './node';
import type { NodeOptions, PortAccessor } from './node';

/** A sink: it receives on inputs and has no outputs, not even an error output. */
export default class WritableNode<TOptions extends object = NodeOptions> extends Node<TOptions> {
  readonly type: typeof NODE_TYPE.WRITABLE = NODE_TYPE.WRITABLE;

  /** Called once when the flow runs; receive through `$i`. */
  _write(_$i: PortAccessor): void {
    // Nothing to write by default.
  }
}
