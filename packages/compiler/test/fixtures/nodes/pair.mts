import { Port, TransformNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';

/** T with two inputs: forwards `a` and `b` values tagged with their port. */
export default class Pair extends TransformNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('a').attach(this);
    Port.I('b').attach(this);
    Port.O('out').attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor): void {
    $i('a').receive((value) => {
      $o('out').send(`a:${String(value)}`);
    });
    $i('b').receive((value) => {
      $o('out').send(`b:${String(value)}`);
    });
  }
}
