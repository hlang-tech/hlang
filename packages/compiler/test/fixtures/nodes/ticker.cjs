// R: emits an increasing counter every 10 ms until the flow is stopped.
const { ReadableNode, Port } = require('@hlang-org/runtime');
const { interval } = require('rxjs');
const { takeUntil } = require('rxjs/operators');

module.exports = class Ticker extends ReadableNode {
  constructor(opts) {
    super(opts);
    Port.O('out').attach(this);
  }
  _read($o) {
    interval(10)
      .pipe(takeUntil(this.opts.signal.observable))
      .subscribe((tick) => $o('out').send(tick));
  }
};
