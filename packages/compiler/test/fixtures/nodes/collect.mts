import { Port, WriteableNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';
import { recorderOf } from './support.mts';

/** W: reports every received value, with its node id, to the host's `record` middleware. */
export default class Collect extends WriteableNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('in').attach(this);
  }

  override _write($i: PortAccessor): void {
    const record = recorderOf(this.opts);
    $i('in').receive((value) => {
      record({ nodeId: this.opts.nodeId, value });
    });
  }
}
