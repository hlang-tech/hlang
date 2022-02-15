

import { WriteableNode, Port } from '../../../src/index';

export default class ConsoleNode extends WriteableNode {
  constructor(opts = {}) {
    super(opts);

    Port.I('Input').attach(this);
  }

  _write($i) {
    $i('Input').on(payload => {
      // eslint-disable-next-line no-console
      console.log('debug console:', payload);
    });
  }
}
