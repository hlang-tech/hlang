import Node from './node';
import Port from '../base/port';
import { ERROR_PORT_NAME, NODE_TYPE } from '../type';

export default class ReadableNode extends Node {
  constructor(opt) {
    super(opt);

    this.type = NODE_TYPE.READABLE;
    Port.O(ERROR_PORT_NAME).attach(this);
  }

  throw(error) {
    super.E().send(error);
  }

  _read(_$o) {
    // NOOP
  }
}
