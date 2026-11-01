import { Port, TransformNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';
import { paramsOf } from './support.mts';

/** T: multiplies each number by `params.factor`. */
export default class Scale extends TransformNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor): void {
    const { factor } = paramsOf(this.opts);
    $i('in').receive((value) => {
      if (typeof value === 'number' && typeof factor === 'number') {
        $o('out').send(value * factor);
      }
    });
  }
}
