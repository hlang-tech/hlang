/**
 *
 * ------       ------
 *  Node  ---->  Node
 * ------       ------
 *
 */
import {
  STREAM_TYPE,
  ERROR_PORT_NAME,
  NODE_ID_PREFIX,
  IDENTITY,
} from '../type';
import Port from '../base/port';
import Flow from '../base/flow';
import { uuid } from '../utils';

class PortMap {
  mapShape: {[key: string]: {[key: string]: Port}};

  constructor() {
    this.mapShape = {
      [STREAM_TYPE.I]: {},
      [STREAM_TYPE.O]: {},
    };
  }

  get(K) {
    return this.mapShape[K];
  }

  getIn(key) {
    // TODO
    const [type, name] = key.split('.');
    return this.mapShape[type][name];
  }

  setIn(key, val) {
    // TODO
    const [type, name] = key.split('.');
    this.mapShape[type][name] = val;
  }
}

export default class Node {
  type: Symbol;
  id: string;
  opts: {[key: string]: any};
  portMap: PortMap;
  isRunning: boolean;
  flow: Flow | null;
  identity: Symbol;
  I: (name: string) => Port;
  O: (name: string) => Port;

  constructor(opts) {
    this.opts = opts;
    this.portMap = new PortMap();
    this.id = `${NODE_ID_PREFIX}-${uuid.create()}`;
    this.isRunning = false;
    this.flow = null;
    this.identity = IDENTITY.NODE;

    Object.keys(STREAM_TYPE).forEach((k) => {
      Object.defineProperty(this, k, {
        get: function () {
          return (name) => this.portMap.getIn(`${k}.${name}`);
        },
      });
    });
  }

  executeOnce(type, ...args) {
    if (this.isRunning) return;

    this.isRunning = true;

    this[`_${type}`](...args);
  }

  E(): Port {
    return this.portMap.getIn(`${STREAM_TYPE.O}.${ERROR_PORT_NAME}`);
  }

  attach(flow) {
    this.flow = flow;
  }

  attachPort(port) {
    this.portMap.setIn(`${port.type}.${port.name}`, port);
  }
}
