/**
 * The state a flow keeps for back-pressure (RFC 0001): how full each
 * connection is, which messages wait for their input, and who waits for room.
 *
 * FBP's model, as JavaFBP implements it: a connection has a capacity; the
 * messages it holds are the ones waiting for its input plus the ones its
 * input is still working on; a sender to a full connection waits.
 */

import type { IPortDesc } from '../type';

/** Thrown into whatever waits on a flow that has been disposed: `ready()`, `write()`. */
export class FlowDisposedError extends Error {
  constructor() {
    super('The flow has been disposed.');
    this.name = 'FlowDisposedError';
  }
}

/** One connection while its flow runs. */
export class ConnectionState {
  /** Messages the connection holds: waiting for its input, or being worked on. */
  occupancy = 0;

  constructor(readonly desc: IPortDesc) {}

  get bounded(): boolean {
    return Number.isFinite(this.desc.capacity);
  }

  get hasRoom(): boolean {
    return this.occupancy < this.desc.capacity;
  }
}

/** A message waiting for its input, and the connection it came by. */
export interface Waiting {
  readonly connection: ConnectionState;
  readonly message: unknown;
}

/**
 * One input port's gate: how many messages it is working on, and the ones
 * waiting for it, first in first out across all its connections.
 */
export class InputGate {
  inFlight = 0;
  private waiting: Waiting[] = [];
  private head = 0;

  push(entry: Waiting): void {
    this.waiting.push(entry);
  }

  /** The oldest waiting message, removed; `undefined` when none waits. */
  shift(): Waiting | undefined {
    const next = this.waiting[this.head];
    if (next === undefined) {
      return undefined;
    }
    this.head += 1;
    if (this.head * 2 >= this.waiting.length) {
      this.waiting = this.waiting.slice(this.head);
      this.head = 0;
    }
    return next;
  }

  /** Removes and returns the oldest message waiting from `connection`, if any. */
  removeOldestOf(connection: ConnectionState): Waiting | undefined {
    for (let index = this.head; index < this.waiting.length; index += 1) {
      const entry = this.waiting[index];
      if (entry?.connection === connection) {
        this.waiting.splice(index, 1);
        return entry;
      }
    }
    return undefined;
  }

  clear(): void {
    this.waiting = [];
    this.head = 0;
  }
}

interface Waiter {
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
}

/**
 * The bounded connections of one output port, and the senders waiting for
 * room in all of them. A fan-out waits for its slowest branch, as Akka
 * Streams' `Broadcast` does.
 */
export class OutputRoom {
  readonly connections: ConnectionState[] = [];
  private waiters: Waiter[] = [];
  private disposed = false;

  readonly hasRoom = (): boolean => this.connections.every((connection) => connection.hasRoom);

  readonly ready = (): Promise<void> => {
    if (this.disposed) {
      return Promise.reject(new FlowDisposedError());
    }
    if (this.hasRoom()) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  };

  /** Lets the waiting senders go once every connection has room. */
  check(): void {
    if (this.waiters.length === 0 || !this.hasRoom()) {
      return;
    }
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) {
      waiter.resolve();
    }
  }

  dispose(): void {
    this.disposed = true;
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) {
      waiter.reject(new FlowDisposedError());
    }
  }
}
