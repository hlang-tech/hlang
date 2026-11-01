import type { Subscription } from 'rxjs';
import build from '../core/build';
import { ConnectionState, FlowDisposedError, InputGate, OutputRoom } from '../core/backpressure';
import type { Waiting } from '../core/backpressure';
import { DeliveryQueue } from '../core/delivery';
import type { DeliveryTimer, SliceOptions } from '../core/delivery';
import type { AnyNode, Teardown } from '../node';
import { nodeInternals } from '../node/node';
import { ERROR_PORT_NAME, NODE_TYPE, STREAM_TYPE } from '../type';
import type { IPortDesc } from '../type';
import type Port from './port';
import { portInternals, reportFailure } from './port';
import type { FailureHandler } from './port';

/** One message delivered on one connection, as a `FlowObserver` sees it. */
export interface DeliveryEvent {
  /** The node that sent the message, and the name of its output port. */
  readonly source: AnyNode;
  readonly sourcePort: string;
  /** The node that received it, and the name of its input port. */
  readonly target: AnyNode;
  readonly targetPort: string;
  readonly message: unknown;
  /**
   * How long the target's handlers took, in milliseconds. Messages they send
   * are queued, not delivered inside this one, so this is their own work.
   * Work a handler schedules for later (a timer, an asynchronous pipe) is
   * not included; a promise a handler returns is (RFC 0001), when the
   * delivery passes its input's gate.
   */
  readonly duration: number;
}

/** A message a full `drop-oldest` connection let go of (RFC 0001). */
export interface DroppedEvent {
  readonly source: AnyNode;
  readonly sourcePort: string;
  readonly target: AnyNode;
  readonly targetPort: string;
  readonly message: unknown;
}

/** A handler failing on a port, as a `FlowObserver` sees it. */
export interface FailureEvent {
  /** The node whose handler failed (`null` for a port not attached to one). */
  readonly node: AnyNode | null;
  /** The name of the port the handler was receiving on. */
  readonly port: string;
  readonly error: unknown;
}

/**
 * Watches a running flow: every delivery and every handler failure, for logs,
 * metrics, tracing or a live view of the graph. It only observes: failures are
 * still routed as without it (a Transform's to its error port, others to
 * `onError`). An observer that throws is reported to `onError` and the flow
 * carries on.
 */
export interface FlowObserver {
  readonly delivered?: (event: DeliveryEvent) => void;
  readonly dropped?: (event: DroppedEvent) => void;
  readonly failed?: (event: FailureEvent) => void;
}

/** How a host creates a flow. */
export interface FlowOptions {
  /**
   * Receives a failure the graph cannot carry: a handler throwing on a
   * Writable's input (it has no error port), an observer of a port throwing,
   * or a node's teardown throwing. Without it, such a failure is rethrown
   * asynchronously, so it is never lost. A Transform's failures go to its own
   * error port either way.
   */
  readonly onError?: FailureHandler;
  /**
   * Sees every delivery and every handler failure. Without one, deliveries
   * are not timed and cost nothing extra.
   */
  readonly observer?: FlowObserver;
  /**
   * Shares the thread: deliveries run in slices of at most `budgetMs`, and
   * the flow yields to the rest of the program between them. Without it, a
   * flow delivers everything a send causes before the send returns, which is
   * fastest, but work that never ends by itself (a feedback loop with no
   * asynchronous step) then holds the thread for good. Pass `{}` for the
   * defaults.
   */
  readonly slice?: SliceOptions;
}

/** An input of this flow: its connections still open, and whether it has ended (RFC 0001). */
interface InputEnd {
  readonly node: NodeEnd;
  /** The connections into it, by output and input port id, and which have closed. */
  readonly connections: Set<string>;
  readonly closed: Set<string>;
  ended: boolean;
}

/** A node this flow runs: its connected inputs not yet ended and its outputs not yet closed. */
interface NodeEnd {
  readonly node: AnyNode;
  readonly inputs: Set<Port>;
  readonly outputs: Set<Port>;
  finished: boolean;
}

/** Someone waiting for the flow to be done. */
interface DoneWaiter {
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
}

/** A node this flow started, and the teardown its start returned, if any. */
interface Started {
  readonly node: AnyNode;
  readonly teardown: Teardown | undefined;
}

/**
 * Runs a graph of nodes from a Readable root. A flow belongs to its host: no
 * node can reach it, and its record of wired connections is private.
 *
 * A flow owns the nodes it starts. `dispose` ends them: it cuts the flow's
 * connections, runs their teardowns and completes their ports.
 */
export default class Flow {
  readonly #onError: FailureHandler | undefined;
  readonly #observer: FlowObserver | undefined;
  /** This flow's deliveries; no other flow waits on them. */
  readonly #deliveries: DeliveryQueue;
  /** The connections this flow has wired, by output and input port id. */
  readonly #wired = new Set<string>();
  /** The subscriptions that carry those connections. */
  readonly #connections: Subscription[] = [];
  /** The nodes this flow started, in the order it started them. */
  readonly #started: Started[] = [];
  /** Each gated input's in-flight count and waiting messages (RFC 0001). */
  readonly #gates = new Map<Port, InputGate>();
  /** Each output's bounded connections and the senders waiting for room. */
  readonly #rooms = new Map<Port, OutputRoom>();
  /** Stops the fast routes from listening for their input becoming gated. */
  readonly #stopListening: (() => void)[] = [];
  /** End of stream (RFC 0001): each input, each node, and the connections from each output. */
  readonly #inputs = new Map<Port, InputEnd>();
  readonly #nodes = new Map<AnyNode, NodeEnd>();
  /** The connections from each output, with the input each one feeds. */
  readonly #outgoing = new Map<Port, { readonly key: string; readonly input: InputEnd; readonly dst: Port }[]>();
  /** Those waiting on `done`; a flow nobody asks about holds no promise that could go unhandled. */
  #doneWaiters: DoneWaiter[] = [];
  #disposed = false;

  constructor(options: FlowOptions = {}) {
    this.#onError = options.onError;
    this.#observer = options.observer;
    this.#deliveries = new DeliveryQueue(options.slice);
  }

  /** Whether `dispose` has been called. */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Resolves once every node this flow runs has finished (RFC 0001): its
   * inputs have ended and its outputs are closed. A source that never closes
   * keeps it pending, as does a feedback loop no node of which closes.
   * Rejects with `FlowDisposedError` if the flow is disposed first.
   */
  get done(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.#disposed) {
        reject(new FlowDisposedError());
      } else if (this.#allFinished()) {
        resolve();
      } else {
        this.#doneWaiters.push({ resolve, reject });
      }
    });
  }

  /**
   * Builds the graph downstream of `root`, wires every connection through the
   * delivery queue, and starts each node once: Writables first, then
   * Transforms, then the root, so every receiver exists before a source sends.
   */
  run(root: AnyNode): void {
    if (this.#disposed) {
      throw new Error('Flow has been disposed.');
    }
    if (root.type !== NODE_TYPE.READABLE) {
      throw new Error('Flow must run with a READABLE node.');
    }
    const graph = build(root);
    this.#trackEnds(graph.connections, [...graph.writable, ...graph.transform, ...graph.readable]);
    // An input fed by a bounded connection takes one message at a time
    // unless it asks otherwise; mark it before any message moves.
    for (const outgoing of graph.connections.values()) {
      for (const { dst, capacity } of outgoing) {
        if (Number.isFinite(capacity)) {
          portInternals.markBoundedInput(dst);
        }
      }
    }
    const nodes: readonly AnyNode[] = [...graph.writable, ...graph.transform, ...graph.readable];
    const failed = this.#observer?.failed;
    for (const node of nodes) {
      for (const port of this.#portsOf(node)) {
        portInternals.setFailureHandler(port, this.#onError);
        if (failed !== undefined) {
          portInternals.setFailureObserver(port, (error) => {
            this.#notify(() => {
              failed({ node, port: port.name, error });
            });
          });
        }
      }
    }

    for (const node of graph.writable) {
      this.#start(node, () => node._write(node.I));
    }
    for (const node of graph.transform) {
      this.#wire(graph.connections.get(node.id) ?? []);
      this.#start(node, () => node._transform(node.I, node.O));
    }
    for (const node of graph.readable) {
      this.#wire(graph.connections.get(node.id) ?? []);
      this.#start(node, () => node._read(node.O));
    }
  }

  /**
   * Ends every node this flow started. In order: the flow's connections are
   * cut, so nothing more is delivered (messages already queued are dropped,
   * and a scheduled slice does nothing);
   * each node's teardown runs, the last started first, with a failing one
   * reported like any other failure while the rest still run; then the nodes'
   * ports complete, which ends every subscription made on them, and later
   * sends are dropped. Nodes another flow started are left running.
   *
   * Safe to call more than once, and from inside a delivery. A disposed flow
   * cannot run again.
   */
  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#deliveries.close();
    for (const waiter of this.#doneWaiters.splice(0)) {
      waiter.reject(new FlowDisposedError());
    }
    for (const stop of this.#stopListening.splice(0)) {
      stop();
    }
    for (const room of this.#rooms.values()) {
      room.dispose();
    }
    for (const gate of this.#gates.values()) {
      gate.clear();
    }
    for (const connection of this.#connections.splice(0)) {
      connection.unsubscribe();
    }
    const started = this.#started.splice(0).reverse();
    for (const { node, teardown } of started) {
      if (teardown === undefined) {
        continue;
      }
      try {
        teardown();
      } catch (error: unknown) {
        reportFailure(this.#onError, error, node);
      }
    }
    for (const { node } of started) {
      for (const port of this.#portsOf(node)) {
        portInternals.close(port);
      }
    }
  }

  /** Starts `node` unless it has already started, and records what it returns. */
  #start(node: AnyNode, start: () => Teardown | void): void {
    let teardown: Teardown | undefined;
    const ran = nodeInternals.startOnce(node, () => {
      teardown = start() ?? undefined;
    });
    if (ran) {
      this.#started.push({ node, teardown });
    }
  }

  /**
   * Records, before any message moves, which connections feed each input and
   * which inputs and outputs each node has, and listens for outputs closing.
   */
  #trackEnds(connections: ReadonlyMap<string, readonly IPortDesc[]>, nodes: readonly AnyNode[]): void {
    for (const node of nodes) {
      this.#nodeEnd(node);
    }
    for (const outgoing of connections.values()) {
      for (const { src, dst, target } of outgoing) {
        const key = `${src.id}@${dst.id}`;
        let input = this.#inputs.get(dst);
        if (input === undefined) {
          const node = this.#nodeEnd(target);
          input = { node, connections: new Set(), closed: new Set(), ended: false };
          this.#inputs.set(dst, input);
          node.inputs.add(dst);
        }
        if (!input.connections.has(key)) {
          input.connections.add(key);
          const from = this.#outgoing.get(src) ?? [];
          from.push({ key, input, dst });
          this.#outgoing.set(src, from);
        }
      }
    }
  }

  /** A node's end-of-stream state, made the first time this flow meets the node. */
  #nodeEnd(node: AnyNode): NodeEnd {
    let state = this.#nodes.get(node);
    if (state === undefined) {
      const outputs = nodeInternals
        .portsOf(node, STREAM_TYPE.O)
        .filter((port) => port.name !== ERROR_PORT_NAME && !portInternals.isClosed(port));
      state = { node, inputs: new Set(), outputs: new Set(outputs), finished: false };
      this.#nodes.set(node, state);
      const owner = state;
      for (const port of nodeInternals.portsOf(node, STREAM_TYPE.O)) {
        portInternals.setCloseHandler(port, () => {
          this.#outputClosed(owner, port);
        });
      }
    }
    return state;
  }

  /** An output has closed: its connections close after what was sent on them, in turn. */
  #outputClosed(state: NodeEnd, port: Port): void {
    if (this.#disposed) {
      return;
    }
    for (const { key, input, dst } of this.#outgoing.get(port) ?? []) {
      this.#deliveries.schedule(() => {
        input.closed.add(key);
        this.#checkInputEnd(dst);
      });
    }
    state.outputs.delete(port);
    this.#checkFinished(state);
  }

  /** Ends an input once every connection into it has closed and its gate is idle. */
  #checkInputEnd(port: Port): void {
    const input = this.#inputs.get(port);
    if (input === undefined || input.ended || input.closed.size < input.connections.size) {
      return;
    }
    if (this.#gates.get(port)?.idle === false) {
      return;
    }
    input.ended = true;
    portInternals.end(port);
    const state = input.node;
    state.inputs.delete(port);
    const { node } = state;
    if (state.inputs.size === 0 && node.type === NODE_TYPE.TRANSFORM && node.closesWithInputs) {
      for (const output of [...state.outputs]) {
        output.close();
      }
    }
    this.#checkFinished(state);
  }

  /** A node whose inputs have ended and outputs closed has finished: its error port closes too. */
  #checkFinished(state: NodeEnd): void {
    if (state.finished || state.inputs.size > 0 || state.outputs.size > 0) {
      return;
    }
    state.finished = true;
    const error = state.node.E();
    if (error !== undefined && !portInternals.isClosed(error)) {
      error.close();
    }
    if (this.#allFinished()) {
      for (const waiter of this.#doneWaiters.splice(0)) {
        waiter.resolve();
      }
    }
  }

  #allFinished(): boolean {
    for (const state of this.#nodes.values()) {
      if (!state.finished) {
        return false;
      }
    }
    return true;
  }

  #portsOf(node: AnyNode): readonly Port[] {
    return [...nodeInternals.portsOf(node, STREAM_TYPE.I), ...nodeInternals.portsOf(node, STREAM_TYPE.O)];
  }

  /**
   * Subscribes each connection once: what its output sends is delivered to
   * its input. An unbounded connection into an input without a concurrency
   * limit goes straight to the delivery queue; any other passes the input's
   * gate (RFC 0001).
   */
  #wire(connections: readonly IPortDesc[]): void {
    for (const desc of connections) {
      const { src, dst } = desc;
      const key = `${src.id}@${dst.id}`;
      if (this.#wired.has(key)) {
        continue;
      }
      this.#wired.add(key);
      const connection = new ConnectionState(desc);
      if (connection.bounded) {
        this.#roomFor(src).connections.push(connection);
      }
      if (connection.bounded || portInternals.isGated(dst)) {
        this.#connections.push(this.#gatedRoute(connection));
        continue;
      }
      // The fast route: straight to the delivery queue. If the input becomes
      // gated later (its node asks for a concurrency when it starts), the
      // connection switches to the gated route; the check costs nothing per
      // message.
      const fast = this.#fastRoute(desc);
      this.#connections.push(fast);
      // Dispose stops this listener, so it only runs while the flow does.
      const stopListening = portInternals.whenGated(dst, () => {
        fast.unsubscribe();
        this.#connections.push(this.#gatedRoute(connection));
      });
      this.#stopListening.push(stopListening);
    }
  }

  /** Subscribes a connection straight to the delivery queue. */
  #fastRoute(desc: IPortDesc): Subscription {
    const { src, dst } = desc;
    const deliveries = this.#deliveries;
    if (this.#observer?.delivered === undefined) {
      return src.receive((message) => {
        deliveries.deliver(dst, message);
      });
    }
    return src.receive((message) => {
      deliveries.deliver(dst, message, this.#timerFor(desc, message));
    });
  }

  /** Subscribes a connection through its input's gate. */
  #gatedRoute(connection: ConnectionState): Subscription {
    return connection.desc.src.receive((message) => {
      this.#offer(connection, message);
    });
  }

  /** The output's room, made and handed to the port the first time it is needed. */
  #roomFor(port: Port): OutputRoom {
    let room = this.#rooms.get(port);
    if (room === undefined) {
      room = new OutputRoom();
      this.#rooms.set(port, room);
      portInternals.setSenderState(port, room);
    }
    return room;
  }

  #gateFor(port: Port): InputGate {
    let gate = this.#gates.get(port);
    if (gate === undefined) {
      gate = new InputGate();
      this.#gates.set(port, gate);
    }
    return gate;
  }

  /**
   * A message arrives at a gated input: the connection counts it, a full
   * `drop-oldest` connection lets its oldest waiting message go, and the
   * message waits its turn.
   */
  #offer(connection: ConnectionState, message: unknown): void {
    const { desc } = connection;
    const gate = this.#gateFor(desc.dst);
    if (connection.bounded) {
      connection.occupancy += 1;
      if (connection.occupancy > desc.capacity && desc.overflow === 'drop-oldest') {
        const dropped = gate.removeOldestOf(connection);
        if (dropped !== undefined) {
          connection.occupancy -= 1;
          this.#reportDropped(desc, dropped.message);
        }
      }
    }
    gate.push({ connection, message });
    this.#pump(gate, desc.dst);
  }

  /** Starts as many waiting messages as the input's concurrency allows. */
  #pump(gate: InputGate, port: Port): void {
    const limit = portInternals.concurrencyOf(port);
    while (gate.inFlight < limit) {
      const next = gate.shift();
      if (next === undefined) {
        return;
      }
      gate.inFlight += 1;
      this.#deliveries.deliver(port, next.message, this.#timerFor(next.connection.desc, next.message), () => {
        this.#settle(gate, port, next);
      });
    }
  }

  /** A message's handlers have settled: free its place, let senders go, start the next. */
  #settle(gate: InputGate, port: Port, entry: Waiting): void {
    if (this.#disposed) {
      return;
    }
    gate.inFlight -= 1;
    const { connection } = entry;
    if (connection.bounded) {
      connection.occupancy -= 1;
      this.#rooms.get(connection.desc.src)?.check();
    }
    this.#pump(gate, port);
    this.#checkInputEnd(port);
  }

  /** Times a delivery for the observer, if there is one. */
  #timerFor(desc: IPortDesc, message: unknown): DeliveryTimer | undefined {
    const delivered = this.#observer?.delivered;
    if (delivered === undefined) {
      return undefined;
    }
    const { src, dst, source, target } = desc;
    return (duration) => {
      if (this.#disposed) {
        return;
      }
      this.#notify(() => {
        delivered({ source, sourcePort: src.name, target, targetPort: dst.name, message, duration });
      });
    };
  }

  #reportDropped(desc: IPortDesc, message: unknown): void {
    const dropped = this.#observer?.dropped;
    if (dropped === undefined) {
      return;
    }
    const { src, dst, source, target } = desc;
    this.#notify(() => {
      dropped({ source, sourcePort: src.name, target, targetPort: dst.name, message });
    });
  }

  /** Runs an observer callback; one that throws is reported, never propagated. */
  #notify(callback: () => void): void {
    try {
      callback();
    } catch (error: unknown) {
      reportFailure(this.#onError, error, null);
    }
  }
}
