import { Port, TransformNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';

/** T: reports every received value on `@node/error` instead of `out`. */
export default class Faulty extends TransformNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
  }

  override _transform($i: PortAccessor): void {
    $i('in').receive((value) => {
      this.throw(`bad:${String(value)}`);
    });
  }
}
