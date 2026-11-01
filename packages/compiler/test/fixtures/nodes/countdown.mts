import { Port, TransformNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';

/**
 * T: for each number n, sends n on `out` and, while n > 0, sends n - 1 on
 * `again`; wired to its own `in`, it counts down to 0.
 */
export default class Countdown extends TransformNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
    Port.O('again').attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor): void {
    $i('in').receive((value) => {
      if (typeof value !== 'number') {
        return;
      }
      $o('out').send(value);
      if (value > 0) {
        $o('again').send(value - 1);
      }
    });
  }
}
