import Node from './node';
import { NODE_TYPE } from '../type';

export default class WritableNode extends Node {
  constructor(opt) {
    super(opt);
    this.type = NODE_TYPE.WRITABLE;
  }

  _write(_$i) {
    // NOOP
  }
}
