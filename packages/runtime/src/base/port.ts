import { Subject } from 'rxjs';
import type { Observable, OperatorFunction, Subscription } from 'rxjs';
import type { AnyNode } from '../node';
import { IDENTITY, STREAM_TYPE } from '../type';
import { uuid } from '../utils';

/**
 * Handles a message arriving on a port. Messages are not typed by the engine:
 * a graph is wired at run time, so a node narrows what it receives.
 */
export type MessageHandler = (message: unknown) => void;

interface PortOptions {
  readonly type: STREAM_TYPE;
  readonly name?: string;
}

/**
 * A named input (`I`) or output (`O`) of a node. A port is a live RxJS stream:
 * `send` pushes a message, `receive` subscribes to them, and `connect` wires an
 * output to an input.
 */
class Port {
  /** Set when the port is attached to a node. */
  id = '';
  readonly name: string;
  readonly type: STREAM_TYPE;
  /** The inputs this output is connected to. */
  readonly peers: Port[] = [];
  node: AnyNode | null = null;
  isActive = false;
  readonly identity: symbol = IDENTITY.PORT;
  /** The stream as transformed by `pipe`, when a pipe is set. */
  $pipedEventEmitter: Observable<unknown> | null = null;
  readonly $eventEmitter = new Subject<unknown>();

  /** A new input port. */
  static I(name: string): Port {
    return new Port({ type: STREAM_TYPE.I, name });
  }

  /** A new output port. */
  static O(name: string): Port {
    return new Port({ type: STREAM_TYPE.O, name });
  }

  constructor({ type, name = '' }: PortOptions) {
    this.name = name;
    this.type = type;
  }

  active(): void {
    this.isActive = true;
  }

  deActive(): void {
    this.isActive = false;
  }

  addPeer(port: Port): void {
    this.peers.push(port);
  }

  /** Attaches the port to `node`, which then resolves it by name. */
  attach(node: AnyNode): void {
    this.node = node;
    node.attachPort(this);
    this.id = uuid.create();
  }

  /** The stream receivers subscribe to: the piped stream when a pipe is set. */
  get $(): Observable<unknown> {
    return this.$pipedEventEmitter ?? this.$eventEmitter;
  }

  /** Pushes `message` into the port's stream; a pipe applies to what receivers get. */
  send(message: unknown): void {
    this.$eventEmitter.next(message);
  }

  /** Sets RxJS operators between what is sent and what receivers get. */
  pipe(...operators: OperatorFunction<unknown, unknown>[]): { receive: (next: MessageHandler) => Subscription } {
    this.$pipedEventEmitter = operators.reduce<Observable<unknown>>((source, operator) => operator(source), this.$eventEmitter);
    return { receive: (next) => this.receive(next) };
  }

  /** @deprecated Use `receive`. */
  on(next: MessageHandler): Subscription {
    console.log('[@hlang-org/runtime]: $().on(() => {}) has been deperecated, please use $().receive(() => {}).');
    return this.receive(next);
  }

  /** Subscribes `next` to every message the port delivers. */
  receive(next: MessageHandler): Subscription {
    return this.$.subscribe((message) => {
      next(message);
    });
  }

  /** Wires this output to the input `port`. Any other direction throws. */
  connect(port: Port): this {
    if (this.type === STREAM_TYPE.O && port.type === STREAM_TYPE.I) {
      this.addPeer(port);
    } else {
      throw new Error(`${this.type} can not connect ${port.type}`);
    }
    return this;
  }
}

export default Port;
