import { Subject } from 'rxjs';
import type { Observable, OperatorFunction, Subscription } from 'rxjs';
import type { AnyNode } from '../node';
import { nodeInternals } from '../node/node';
import { IDENTITY, NODE_TYPE, STREAM_TYPE } from '../type';
import { uuid } from '../utils';

/**
 * Handles a message arriving on a port. Messages are not typed by the engine:
 * a graph is wired at run time, so a node narrows what it receives.
 */
export type MessageHandler = (message: unknown) => void;

/** Reports a failure the graph itself cannot carry (see `Port#receive`). */
export type FailureHandler = (error: unknown, node: AnyNode | null) => void;

/**
 * Hands a failure the graph cannot carry to `handler`, or rethrows it
 * asynchronously when there is none, so it is never lost and never unwinds
 * the code that reported it.
 */
export function reportFailure(handler: FailureHandler | undefined, error: unknown, node: AnyNode | null): void {
  if (handler !== undefined) {
    handler(error, node);
    return;
  }
  queueMicrotask(() => {
    throw error;
  });
}

interface PortOptions {
  readonly type: STREAM_TYPE;
  readonly name?: string;
}

/**
 * Engine access to a port's private state, for the modules that build and run
 * a graph. It is set once by the class below and never exported from the
 * package, so a node can reach its own ports only through their public methods.
 */
export let portInternals: {
  readonly peersOf: (port: Port) => readonly Port[];
  readonly ownerOf: (port: Port) => AnyNode | null;
  readonly setFailureHandler: (port: Port, handler: FailureHandler | undefined) => void;
  /** Completes the port's stream: every receiver ends and later sends are dropped. */
  readonly close: (port: Port) => void;
};

/**
 * A named input (`I`) or output (`O`) of a node. A port is a live RxJS stream:
 * `send` pushes a message, `receive` subscribes to them, and `connect` wires an
 * output to an input. Its stream, its peers and its owner are private: nodes
 * share nothing but the messages on their connections.
 */
class Port {
  static {
    portInternals = {
      peersOf: (port) => port.#peers,
      ownerOf: (port) => port.#owner,
      setFailureHandler: (port, handler) => {
        port.#onFailure = handler;
      },
      close: (port) => {
        port.#stream.complete();
      },
    };
  }

  /** Set when the port is attached to a node. */
  id = '';
  readonly name: string;
  readonly type: STREAM_TYPE;
  readonly identity: symbol = IDENTITY.PORT;

  readonly #stream = new Subject<unknown>();
  #piped: Observable<unknown> | null = null;
  readonly #peers: Port[] = [];
  #owner: AnyNode | null = null;
  #onFailure: FailureHandler | undefined = undefined;

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

  /** Attaches the port to `node`, which then resolves it by name. */
  attach(node: AnyNode): void {
    this.#owner = node;
    nodeInternals.attachPort(node, this);
    this.id = uuid.create();
  }

  /** The stream receivers get, read-only: the piped stream when a pipe is set. */
  get $(): Observable<unknown> {
    return this.#piped ?? this.#stream.asObservable();
  }

  /**
   * Pushes `message` into the port's stream; a pipe applies to what receivers
   * get. Once the flow that started the port's node is disposed, it is dropped.
   */
  send(message: unknown): void {
    this.#stream.next(message);
  }

  /** Sets RxJS operators between what is sent and what receivers get. */
  pipe(...operators: OperatorFunction<unknown, unknown>[]): { receive: (next: MessageHandler) => Subscription } {
    this.#piped = operators.reduce<Observable<unknown>>((source, operator) => operator(source), this.#stream);
    return { receive: (next) => this.receive(next) };
  }

  /** @deprecated Use `receive`. */
  on(next: MessageHandler): Subscription {
    console.log('[@hlang-org/runtime]: $().on(() => {}) has been deperecated, please use $().receive(() => {}).');
    return this.receive(next);
  }

  /**
   * Subscribes `next` to every message the port delivers. A failure in `next`
   * never ends the subscription: on a Transform's input it is sent on the
   * node's error port, like an error the node throws itself; anywhere else it
   * goes to the flow's `onError`, or is rethrown asynchronously when the flow
   * has none, so it is never lost.
   */
  receive(next: MessageHandler): Subscription {
    return this.$.subscribe((message) => {
      try {
        next(message);
      } catch (error: unknown) {
        this.#fail(error);
      }
    });
  }

  /** Wires this output to the input `port`. Any other direction throws. */
  connect(port: Port): this {
    if (this.type === STREAM_TYPE.O && port.type === STREAM_TYPE.I) {
      this.#peers.push(port);
    } else {
      throw new Error(`${this.type} can not connect ${port.type}`);
    }
    return this;
  }

  #fail(error: unknown): void {
    const owner = this.#owner;
    if (owner !== null && this.type === STREAM_TYPE.I && owner.type === NODE_TYPE.TRANSFORM) {
      owner.E().send(error);
      return;
    }
    reportFailure(this.#onFailure, error, owner);
  }
}

export default Port;
