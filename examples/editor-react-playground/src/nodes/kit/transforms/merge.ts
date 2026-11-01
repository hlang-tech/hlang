/**
 * Merge (T, multi-input): interleaves two input streams A and B onto one output
 * (RxJS `merge` semantics — whichever arrives is forwarded). Demonstrates a
 * multi-named-input node, which gives the graph genuine fan-in branching.
 */

import { defineNode } from '../../define-node';
import { rt } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class Merge extends rt.TransformNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    rt.Port.I('A').attach(this);
    rt.Port.I('B').attach(this);
    rt.Port.O('Output').attach(this);
  }
  override _transform(i: (name: string) => RuntimePortLike, o: (name: string) => RuntimePortLike): void {
    i('A').receive((payload: unknown) => {
      o('Output').send(payload);
    });
    i('B').receive((payload: unknown) => {
      o('Output').send(payload);
    });
  }
}

export const merge = defineNode({
  code: 'merge',
  kind: 'T',
  displayName: 'Merge · A+B',
  group: 'transforms',
  // Canonical T ports use "Input"; here we override with two named inputs.
  ports: [
    { id: 'A', direction: 'I', name: 'A', dataType: { name: 'DTO', kind: 'interface' }, isError: false },
    { id: 'B', direction: 'I', name: 'B', dataType: { name: 'DTO', kind: 'interface' }, isError: false },
    { id: 'Output', direction: 'O', name: 'Output', dataType: { name: 'DTO', kind: 'interface' }, isError: false },
    { id: '@node/error', direction: 'O', name: 'error', dataType: { name: 'DTO', kind: 'interface' }, isError: true },
  ],
  ctor: Merge,
});
