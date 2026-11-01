import { Port, WriteableNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';
import { recorderOf } from './support.mts';

/**
 * W: works on each value asynchronously, and reports it with how many values
 * it was working on when it started, so a test can see one-at-a-time.
 */
export default class SlowCollect extends WriteableNode<INodeConstructionOptions> {
  #inFlight = 0;

  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('in').attach(this);
  }

  override _write($i: PortAccessor): void {
    const record = recorderOf(this.opts);
    $i('in').receive(async (value) => {
      this.#inFlight += 1;
      const concurrent = this.#inFlight;
      await new Promise((resolve) => setTimeout(resolve, 1));
      this.#inFlight -= 1;
      record({ nodeId: this.opts.nodeId, value: { value, concurrent } });
    });
  }
}
