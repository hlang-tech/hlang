import { Port, ReadableNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';
import { interval, takeUntil } from 'rxjs';

/** R: sends an increasing counter every 10 ms until the flow is stopped. */
export default class Ticker extends ReadableNode<INodeConstructionOptions> {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.O('out').attach(this);
  }

  override _read($o: PortAccessor): void {
    interval(10)
      .pipe(takeUntil(this.opts.signal.observable))
      .subscribe((tick) => {
        $o('out').send(tick);
      });
  }
}
