import Node from './node';
import Port from '../base/port';
import { ERROR_PORT_NAME, NODE_TYPE } from '../type';
import { uuid } from '../utils';

export default class ReadableNode extends Node {
  constructor(opt) {
    super(opt);

    this.type = NODE_TYPE.READABLE;
    Port.O(ERROR_PORT_NAME).attach(this);
  }

  _getTraceId() {
    return uuid.create();
  }

  throw(error) {
    super.E().send(error);
  }

  traceAttach(payload) {
    return {
      _traceId: this._getTraceId(),
      payload: payload,
    };
  }

  _read(_$o) {
    // NOOP
  }
}
