import Node from './node';
import Port from '../base/port';
import { ERROR_PORT_NAME, NODE_TYPE } from '../type';

export default class TransformNode extends Node {
  constructor(opt) {
    super(opt);

    this.type = NODE_TYPE.TRANSFORM;
    Port.O(ERROR_PORT_NAME).attach(this);
  }

  throw(error) {
    this.E().send(error);
  }

  _transform(_$i, _$o) {
    // NOOP
  }
}
