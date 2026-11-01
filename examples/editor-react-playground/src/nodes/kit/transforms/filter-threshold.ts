/**
 * Filter · Threshold (T): forwards numeric payloads that pass a `>= min`
 * threshold, drops the rest (RxJS `filter`). Non-numbers pass through.
 */

import { defineNode } from '../../define-node';
import { rt, paramsOf } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class FilterThreshold extends rt.TransformNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    rt.Port.I('Input').attach(this);
    rt.Port.O('Output').attach(this);
  }
  override _transform(i: (name: string) => RuntimePortLike, o: (name: string) => RuntimePortLike): void {
    const params = paramsOf(this);
    const min = typeof params.min === 'number' ? params.min : 0;
    i('Input').receive((payload: unknown) => {
      if (typeof payload !== 'number' || payload >= min) {
        o('Output').send(payload);
      }
    });
  }
}

export const filterThreshold = defineNode({
  code: 'filter-threshold',
  kind: 'T',
  displayName: 'Filter · ≥ min',
  group: 'transforms',
  defaultParams: { min: 0 },
  ctor: FilterThreshold,
});
