
import { Subject } from "rxjs";
import Node from '../node';
import { STREAM_TYPE, IDENTITY, NOOP } from "../type";
import { uuid, findMyFlow } from "../utils";
import { catchError } from "rxjs/operators";

class Port {
  id: string;
  name: string;
  type: string;
  peers: Port[];
  node: Node | null;
  isActive: boolean;
  identity: symbol;
  static I: (name:string) => Port;
  static O: (name:string) => Port;
  $pipedEventEmitter: any;
  $eventEmitter: Subject<any>;


  constructor({ type, name = "" }) {
    this.name = name;
    this.type = type;
    this.peers = [];
    this.node = null;
    this.isActive = false;
    this.identity = IDENTITY.PORT;
  }



  active() {
    this.isActive = true;
  }

  deActive() {
    this.isActive = false;
  }

  addPeer(val: Port) {
    this.peers.push(val);
  }


  attach(node: Node) {
    // TODO: asserts
    this.node = node;
    this.node.attachPort(this);
    this.id = uuid.create();

    // 确保唯一
    this.$eventEmitter = new (Subject as any)(`${node.id}->${this.id}`);
  }

  get $() {
    return this.$pipedEventEmitter || this.$eventEmitter;
  }

  send(msg) {
    const $emitter = this.$pipedEventEmitter || this.$eventEmitter;

    $emitter.next(msg);
  }

  pipe(...args) {
    this.$pipedEventEmitter = this.$eventEmitter.pipe.apply(
      this.$eventEmitter,
      [
        ...args,

        // 管道中的未捕获异常处理
        catchError((err) => {
          throw err;
        }),
      ] as any
    );
    return {
      on: this.on.bind(this),
    };
  }

  on(next) {
    const onNext = (...args) => next(...args);
    const { traceManager } = findMyFlow(this);

    const onError =
      (traceManager && traceManager.uncaughtExceptionHandler) || NOOP;

    const $emitter = this.$pipedEventEmitter || this.$eventEmitter;

    return $emitter.subscribe(onNext, onError);
  }

  // core
  connect(port) {
    if (this.type === STREAM_TYPE.O && port.type === STREAM_TYPE.I) {
      this.addPeer(port);
    } else {
      throw new Error(`${this.type} can not connect ${port.type}`);
    }

    return this;
  }
}

Port.I = (name) => {
  return new Port({ type: STREAM_TYPE.I, name });
};

Port.O = (name) => {
  return new Port({ type: STREAM_TYPE.O, name });
};

export default Port;
