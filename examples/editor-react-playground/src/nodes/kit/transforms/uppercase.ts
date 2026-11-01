/**
 * Uppercase (T): upper-cases string payloads; passes non-strings through.
 */

import { defineNode } from '../../define-node';
import { rt } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class Uppercase extends rt.TransformNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    rt.Port.I('Input').attach(this);
    rt.Port.O('Output').attach(this);
  }
  override _transform(i: (name: string) => RuntimePortLike, o: (name: string) => RuntimePortLike): void {
    i('Input').receive((payload: unknown) => {
      o('Output').send(typeof payload === 'string' ? payload.toUpperCase() : payload);
    });
  }
}

export const uppercase = defineNode({
  code: 'uppercase',
  kind: 'T',
  displayName: 'Uppercase',
  group: 'transforms',
  defaultParams: { enabled: true, note: 'uppercases its input' },
  ctor: Uppercase,
});
