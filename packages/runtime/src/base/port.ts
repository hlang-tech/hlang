import { Subject } from 'rxjs';
import type { Observable, OperatorFunction, Subscription } from 'rxjs';
import type { AnyNode } from '../node';
import { nodeInternals } from '../node/node';
import { IDENTITY, NODE_TYPE, STREAM_TYPE } from '../type';
import { uuid } from '../utils';

/**
 * Handles a message arriving on a port. Messages are not typed by the engine:
 * a graph is wired at run time, so a node narrows what it receives. A handler
 * that returns a promise is working on the message until it settles (RFC 0001).
 */
export type MessageHandler = (message: unknown) => unknown;

/** How an input port takes messages. */
export interface ReceiveOptions {
  /**
   * How many messages the port works on at once; the rest wait in their
   * connections. `1` is FBP's one packet at a time. Without it, a port fed by
   * a bounded connection takes one at a time and any other port takes all.
   */
  readonly concurrency?: number;
}

/** What a full bounded connection does with a new message. */
export type Overflow = 'drop-oldest';

/** How a connection between an output and an input behaves (RFC 0001). */
export interface ConnectOptions {
  /**
   * How many messages the connection holds, counting the ones its input is
   * still working on. When it is full, `send` reports it and `ready` and
   * `write` wait. Without it, the connection is unbounded.
   */
  readonly capacity?: number;
  /** `'drop-oldest'`: when full, drop the oldest waiting message instead of holding more (JavaFBP's `dropOldest`). */
  readonly overflow?: Overflow;
}

/** One connection made with `connect`, from this output to `port`. */
export interface Link {
  readonly port: Port;
  readonly options: ConnectOptions;
}

/** What a flow tells an output port about room in its bounded connections. */
export interface SenderState {
  /** Whether every bounded connection of the port has room. */
  readonly hasRoom: () => boolean;
  /** Resolves when every bounded connection of the port has room. */
  readonly ready: () => Promise<void>;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** Reports a failure the graph itself cannot carry (see `Port#receive`). */
export type FailureHandler = (error: unknown, node: AnyNode | null) => void;

/** Sees every failure of a handler on a port, before it is routed. */
export type FailureObserver = (error: unknown, port: Port) => void;

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
  readonly ownerOf: (port: Port) => AnyNode | null;
  readonly setFailureHandler: (port: Port, handler: FailureHandler | undefined) => void;
  readonly setFailureObserver: (port: Port, observer: FailureObserver | undefined) => void;
  /** Completes the port's stream: every receiver ends and later sends are dropped. */
  readonly close: (port: Port) => void;
  /** Every connection made from this output, with its options. */
  readonly linksOf: (port: Port) => readonly Link[];
  /**
   * Sends `message` and returns a promise that settles when every handler it
   * started has settled, or `undefined` when none returned a promise.
   */
  readonly deliverTracked: (port: Port, message: unknown) => Promise<void> | undefined;
  /** Whether messages to this input must pass its gate (a concurrency limit or a bounded input). */
  readonly isGated: (port: Port) => boolean;
  /** The number of messages this input works on at once. */
  readonly concurrencyOf: (port: Port) => number;
  /** Marks an input as fed by a bounded connection. */
  readonly markBoundedInput: (port: Port) => void;
  /** Calls `listener` once the input becomes gated; returns a function that stops listening. */
  readonly whenGated: (port: Port, listener: () => void) => () => void;
  /** Lets a flow report room in this output's bounded connections. */
  readonly setSenderState: (port: Port, state: SenderState | undefined) => void;
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
      ownerOf: (port) => port.#owner,
      setFailureHandler: (port, handler) => {
        port.#onFailure = handler;
      },
      setFailureObserver: (port, observer) => {
        port.#observeFailure = observer;
      },
      close: (port) => {
        port.#stream.complete();
      },
      linksOf: (port) => port.#links,
      deliverTracked: (port, message) => {
        const outer = port.#tracked;
        const tracked: PromiseLike<unknown>[] = [];
        port.#tracked = tracked;
        try {
          port.#stream.next(message);
        } finally {
          port.#tracked = outer;
        }
        if (tracked.length === 0) {
          return undefined;
        }
        return Promise.allSettled(tracked).then(() => undefined);
      },
      isGated: (port) => port.#concurrency !== undefined || port.#boundedInput,
      concurrencyOf: (port) => port.#concurrency ?? (port.#boundedInput ? 1 : Number.POSITIVE_INFINITY),
      markBoundedInput: (port) => {
        port.#gate(() => {
          port.#boundedInput = true;
        });
      },
      whenGated: (port, listener) => {
        port.#gatedListeners.add(listener);
        return () => {
          port.#gatedListeners.delete(listener);
        };
      },
      setSenderState: (port, state) => {
        port.#sender = state;
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
  readonly #links: Link[] = [];
  #owner: AnyNode | null = null;
  #onFailure: FailureHandler | undefined = undefined;
  #observeFailure: FailureObserver | undefined = undefined;
  /** The promises handlers return during a tracked delivery; `undefined` otherwise. */
  #tracked: PromiseLike<unknown>[] | undefined = undefined;
  #concurrency: number | undefined = undefined;
  #boundedInput = false;
  #sender: SenderState | undefined = undefined;
  readonly #gatedListeners = new Set<() => void>();

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
   *
   * Returns whether every bounded connection of the port still has room. The
   * message is accepted either way (as Node.js streams' `write` accepts past
   * its high-water mark); on `false`, a sender that respects back-pressure
   * waits for `ready()` before sending more.
   */
  send(message: unknown): boolean {
    this.#stream.next(message);
    return this.#sender?.hasRoom() ?? true;
  }

  /**
   * Resolves when every bounded connection of this output has room (at once
   * when it has none). Rejects with `FlowDisposedError` if the flow is
   * disposed first.
   */
  ready(): Promise<void> {
    return this.#sender?.ready() ?? Promise.resolve();
  }

  /**
   * FBP's suspending send: waits until every bounded connection of this
   * output has room, then sends `message`.
   */
  async write(message: unknown): Promise<void> {
    await this.ready();
    this.send(message);
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
  receive(next: MessageHandler, options: ReceiveOptions = {}): Subscription {
    if (options.concurrency !== undefined) {
      if (!positiveInteger(options.concurrency) && options.concurrency !== Number.POSITIVE_INFINITY) {
        throw new RangeError('Port concurrency must be a positive integer or Infinity.');
      }
      const concurrency = options.concurrency;
      this.#gate(() => {
        this.#concurrency = Math.min(this.#concurrency ?? Number.POSITIVE_INFINITY, concurrency);
      });
    }
    return this.$.subscribe((message) => {
      let result: unknown;
      try {
        result = next(message);
      } catch (error: unknown) {
        this.#fail(error);
        return;
      }
      if (isThenable(result)) {
        // An asynchronous handler: its rejection is a failure like a throw,
        // and while it is pending the message is still being worked on.
        const settled = Promise.resolve(result).then(undefined, (error: unknown) => {
          this.#fail(error);
        });
        this.#tracked?.push(settled);
      }
    });
  }

  /**
   * Wires this output to the input `port`. Any other direction throws. With a
   * `capacity`, the connection is bounded (RFC 0001).
   */
  connect(port: Port, options: ConnectOptions = {}): this {
    if (this.type !== STREAM_TYPE.O || port.type !== STREAM_TYPE.I) {
      throw new Error(`${this.type} can not connect ${port.type}`);
    }
    if (options.capacity !== undefined && !positiveInteger(options.capacity)) {
      throw new RangeError('Connection capacity must be a positive integer.');
    }
    this.#links.push({ port, options });
    return this;
  }

  /** Applies `change`, and tells the listeners if it made the port gated. */
  #gate(change: () => void): void {
    const wasGated = this.#concurrency !== undefined || this.#boundedInput;
    change();
    if (wasGated) {
      return;
    }
    const listeners = [...this.#gatedListeners];
    this.#gatedListeners.clear();
    for (const listener of listeners) {
      listener();
    }
  }

  #fail(error: unknown): void {
    this.#observeFailure?.(error, this);
    const owner = this.#owner;
    if (owner !== null && this.type === STREAM_TYPE.I && owner.type === NODE_TYPE.TRANSFORM) {
      owner.E().send(error);
      return;
    }
    reportFailure(this.#onFailure, error, owner);
  }
}

export default Port;
