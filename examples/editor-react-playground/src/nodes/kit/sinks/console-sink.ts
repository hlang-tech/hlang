/**
 * Console Sink (W): reports each received value to a host-provided callback.
 * The callback is injected at registry-assembly time (the sink is otherwise a
 * pure kit node with no host knowledge).
 */

import { defineNode } from '../../define-node';
import { asCtor, rt } from '../../runtime-boundary';
import type { INodeConstructionOptions, NodeConstructor, RuntimePortLike } from '../../runtime-boundary';

/** Build a console-sink definition bound to a value reporter. */
export function makeConsoleSink(onValue: (value: unknown) => void): NodeConstructor {
  class ConsoleSink extends rt.WriteableNode {
    constructor(opts: INodeConstructionOptions) {
      super(opts);
      rt.Port.I('Input').attach(this);
    }
    _write(i: (name: string) => RuntimePortLike): void {
      i('Input').receive(onValue);
    }
  }
  return asCtor(ConsoleSink);
}

/** The design-time descriptor (runtime ctor is supplied at assembly). */
export const consoleSinkDescriptor = defineNode({
  code: 'console-sink',
  kind: 'W',
  displayName: 'Console',
  group: 'sinks',
  ctor: makeConsoleSink(() => undefined), // placeholder; replaced at assembly
}).descriptor;
