/**
 * Interval Source (R): emits an incrementing tick every `periodMs`, until the
 * flow is stopped. A hot, continuous stream — the canvas shows it living.
 */

import { interval } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { defineNode } from '../../define-node';
import { rt, paramsOf, asCtor } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class IntervalSource extends rt.ReadableNode {
  private readonly stop: INodeConstructionOptions['signal'];
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    this.stop = opts.signal;
    rt.Port.O('Output').attach(this);
  }
  _read(o: (name: string) => RuntimePortLike): void {
    const params = paramsOf(this);
    const period = typeof params.periodMs === 'number' ? params.periodMs : 900;
    interval(period)
      .pipe(
        map(n => n + 1),
        takeUntil(this.stop.observable),
      )
      .subscribe(n => {
        o('Output').send(`tick ${String(n)}`);
      });
  }
}

export const intervalSource = defineNode({
  code: 'interval-source',
  kind: 'R',
  displayName: 'Interval',
  group: 'sources',
  defaultParams: { periodMs: 900 },
  ctor: asCtor(IntervalSource),
});
