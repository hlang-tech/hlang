/**
 * Range Source (R): emits the integers [start, start+count) once, in order.
 */

import { range, takeUntil } from 'rxjs';
import { defineNode } from '../../define-node';
import { rt, paramsOf } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class RangeSource extends rt.ReadableNode {
  private readonly stop: INodeConstructionOptions['signal'];
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    this.stop = opts.signal;
    rt.Port.O('Output').attach(this);
  }
  override _read(o: (name: string) => RuntimePortLike): void {
    const params = paramsOf(this);
    const start = typeof params.start === 'number' ? params.start : 0;
    const count = typeof params.count === 'number' ? params.count : 5;
    range(start, count)
      .pipe(takeUntil(this.stop.observable))
      .subscribe(n => {
        o('Output').send(n);
      });
  }
}

export const rangeSource = defineNode({
  code: 'range-source',
  kind: 'R',
  displayName: 'Range',
  group: 'sources',
  defaultParams: { start: 0, count: 5 },
  ctor: RangeSource,
});
