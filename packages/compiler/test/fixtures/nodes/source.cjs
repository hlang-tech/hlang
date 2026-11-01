// R: emits each value of `params.values` on `out`.
const { ReadableNode, Port } = require('@hlang-org/runtime');

module.exports = class Source extends ReadableNode {
  constructor(opts) {
    super(opts);
    Port.O('out').attach(this);
  }
  _read($o) {
    for (const value of this.opts.config.params.values) {
      $o('out').send(value);
    }
  }
};
