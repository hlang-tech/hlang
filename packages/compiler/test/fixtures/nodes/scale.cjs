// T: multiplies each number by `params.factor`.
const { TransformNode, Port } = require('@hlang-org/runtime');

module.exports = class Scale extends TransformNode {
  constructor(opts) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
  }
  _transform($i, $o) {
    const { factor } = this.opts.config.params;
    $i('in').receive((value) => $o('out').send(value * factor));
  }
};
