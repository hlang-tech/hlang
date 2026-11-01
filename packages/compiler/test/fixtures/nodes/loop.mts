import { Port, TransformNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';
import type { SinkEntry } from './support.mts';
import { recorderOf } from './support.mts';

/** T: forwards everything and reports each forward; two of them in a cycle loop forever. */
export default class Loop extends TransformNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor): void {
    const record = recorderOf(this.opts);
    $i('in').receive((value) => {
      const entry: SinkEntry = { nodeId: this.opts.nodeId, value };
      record(entry);
      $o('out').send(value);
    });
  }
}
