import { Port, ReadableNode } from '@hlang-org/runtime';
import type { PortAccessor, Teardown } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';

/** R: sends an increasing counter every 10 ms and returns a teardown that stops it. */
export default class TeardownTicker extends ReadableNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.O('out').attach(this);
  }

  override _read($o: PortAccessor): Teardown {
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      $o('out').send(tick);
    }, 10);
    return () => {
      clearInterval(timer);
    };
  }
}
