// W: records every received value with its node id in `globalThis.hlangSink`.
const { WriteableNode, Port } = require('@hlang-org/runtime');

module.exports = class Collect extends WriteableNode {
  constructor(opts) {
    super(opts);
    Port.I('in').attach(this);
  }
  _write($i) {
    const sink = (globalThis.hlangSink ??= []);
    $i('in').receive((value) => sink.push({ nodeId: this.opts.nodeId, value }));
  }
};
