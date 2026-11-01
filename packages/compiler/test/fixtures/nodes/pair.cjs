// T with two inputs: forwards `a` and `b` values tagged with their port.
const { TransformNode, Port } = require('@hlang-org/runtime');

module.exports = class Pair extends TransformNode {
  constructor(opts) {
    super(opts);
    Port.I('a').attach(this);
    Port.I('b').attach(this);
    Port.O('out').attach(this);
  }
  _transform($i, $o) {
    $i('a').receive((value) => $o('out').send(`a:${value}`));
    $i('b').receive((value) => $o('out').send(`b:${value}`));
  }
};
