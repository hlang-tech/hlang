/**
 * Constant Source (R): emits one configured numeric value once.
 */

import { defineNode } from '../../define-node';
import { rt, paramsOf } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class ConstantSource extends rt.ReadableNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    rt.Port.O('Output').attach(this);
  }
  override _read(o: (name: string) => RuntimePortLike): void {
    const params = paramsOf(this);
    const value = typeof params.value === 'number' ? params.value : 42;
    o('Output').send(value);
  }
}

export const constantSource = defineNode({
  code: 'constant-source',
  kind: 'R',
  displayName: 'Constant',
  group: 'sources',
  defaultParams: { value: 42 },
  ctor: ConstantSource,
});
