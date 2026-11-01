/**
 * Text Source (R): emits a single configured string once.
 */

import { defineNode } from '../../define-node';
import { rt, paramsOf, asCtor } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class TextSource extends rt.ReadableNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    rt.Port.O('Output').attach(this);
  }
  _read(o: (name: string) => RuntimePortLike): void {
    const params = paramsOf(this);
    const text = typeof params.text === 'string' ? params.text : '';
    o('Output').send(text);
  }
}

export const textSource = defineNode({
  code: 'text-source',
  kind: 'R',
  displayName: 'Text Source',
  group: 'sources',
  defaultParams: { text: 'hello, hlang' },
  ctor: asCtor(TextSource),
});
