import { Port, WriteableNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';

/** W: its handler throws for every received value; a Writable has no error port. */
export default class FailingSink extends WriteableNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('in').attach(this);
  }

  override _write($i: PortAccessor): void {
    $i('in').receive((value) => {
      throw new Error(`sink:${String(value)}`);
    });
  }
}
