/**
 * Map · Scale (T): multiplies numeric payloads by `factor` (RxJS `map`).
 * Non-numbers pass through unchanged.
 */

import { defineNode } from '../../define-node';
import { rt, paramsOf } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class MapScale extends rt.TransformNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    rt.Port.I('Input').attach(this);
    rt.Port.O('Output').attach(this);
  }
  override _transform(i: (name: string) => RuntimePortLike, o: (name: string) => RuntimePortLike): void {
    const params = paramsOf(this);
    const factor = typeof params.factor === 'number' ? params.factor : 2;
    i('Input').receive((payload: unknown) => {
      o('Output').send(typeof payload === 'number' ? payload * factor : payload);
    });
  }
}

export const mapScale = defineNode({
  code: 'map-scale',
  kind: 'T',
  displayName: 'Map · Scale',
  group: 'transforms',
  defaultParams: { factor: 2 },
  ctor: MapScale,
});
