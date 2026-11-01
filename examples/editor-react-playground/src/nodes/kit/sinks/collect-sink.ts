/**
 * Collect Sink (W): accumulates received values and reports a running summary
 * (count + last value) to a host callback. Illustrates a stateful sink.
 */

import { defineNode } from '../../define-node';
import { rt } from '../../runtime-boundary';
import type { INodeConstructionOptions, NodeConstructor, RuntimePortLike } from '../../runtime-boundary';

export function makeCollectSink(onSummary: (summary: string) => void): NodeConstructor {
  class CollectSink extends rt.WriteableNode {
    constructor(opts: INodeConstructionOptions) {
      super(opts);
      rt.Port.I('Input').attach(this);
    }
    override _write(i: (name: string) => RuntimePortLike): void {
      let count = 0;
      i('Input').receive((value: unknown) => {
        count += 1;
        onSummary(`collected ${String(count)}, last = ${String(value)}`);
      });
    }
  }
  return CollectSink;
}

export const collectSinkDescriptor = defineNode({
  code: 'collect-sink',
  kind: 'W',
  displayName: 'Collect',
  group: 'sinks',
  ctor: makeCollectSink(() => undefined),
}).descriptor;
