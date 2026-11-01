import { Port, ReadableNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';
import { paramsOf } from './support.mts';

/** R: sends each value of `params.values` on `out`. */
export default class Source extends ReadableNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.O('out').attach(this);
  }

  override _read($o: PortAccessor): void {
    const { values } = paramsOf(this.opts);
    for (const value of Array.isArray(values) ? values : []) {
      $o('out').send(value);
    }
  }
}
