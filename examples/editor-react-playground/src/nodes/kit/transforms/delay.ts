/**
 * Delay (T): forwards each payload after `ms` milliseconds (RxJS timer per
 * item), cancelled on stop.
 */

import { takeUntil, timer } from 'rxjs';
import { defineNode } from '../../define-node';
import { paramsOf, rt } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class Delay extends rt.TransformNode {
  private readonly stop: INodeConstructionOptions['signal'];
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    this.stop = opts.signal;
    rt.Port.I('Input').attach(this);
    rt.Port.O('Output').attach(this);
  }
  override _transform(i: (name: string) => RuntimePortLike, o: (name: string) => RuntimePortLike): void {
    const params = paramsOf(this);
    const ms = typeof params.ms === 'number' ? params.ms : 300;
    i('Input').receive((payload: unknown) => {
      timer(ms)
        .pipe(takeUntil(this.stop.observable))
        .subscribe(() => {
          o('Output').send(payload);
        });
    });
  }
}

export const delay = defineNode({
  code: 'delay',
  kind: 'T',
  displayName: 'Delay',
  group: 'transforms',
  defaultParams: { ms: 300 },
  ctor: Delay,
});
