/**
 * Scan · Sum (T): running total of numeric payloads (RxJS `scan`), emitting the
 * accumulated sum on each input. Non-numbers are ignored.
 */

import { defineNode } from '../../define-node';
import { asCtor, rt } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class ScanSum extends rt.TransformNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    rt.Port.I('Input').attach(this);
    rt.Port.O('Output').attach(this);
  }
  _transform(i: (name: string) => RuntimePortLike, o: (name: string) => RuntimePortLike): void {
    let total = 0;
    i('Input').receive((payload: unknown) => {
      if (typeof payload === 'number') {
        total += payload;
        o('Output').send(total);
      }
    });
  }
}

export const scanSum = defineNode({
  code: 'scan-sum',
  kind: 'T',
  displayName: 'Scan · Sum',
  group: 'transforms',
  ctor: asCtor(ScanSum),
});
