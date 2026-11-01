// T: reports every received value on `@node/error` instead of `out`.
const { TransformNode, Port } = require('@hlang-org/runtime');

module.exports = class Faulty extends TransformNode {
  constructor(opts) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
  }
  _transform($i, $o) {
    $i('in').receive((value) => $o('@node/error').send(`bad:${value}`));
  }
};
