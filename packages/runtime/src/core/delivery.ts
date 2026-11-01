import type Port from '../base/port';

/** Called after a delivery with how long it took, in milliseconds. */
export type DeliveryTimer = (duration: number) => void;

/** One message on its way to one input port. */
interface Delivery {
  readonly port: Port;
  readonly message: unknown;
  readonly timer: DeliveryTimer | undefined;
}

/** Below this many delivered entries, the queue is not worth compacting. */
const COMPACT_AFTER = 1024;

/**
 * Delivers every message on a connection through one FIFO queue, drained by a
 * single loop (a trampoline: the drain loop of RxJava and Reactor, RxJS's
 * `queueScheduler`).
 *
 * A message sent while a delivery is running is queued, not delivered in a
 * nested call, so:
 *
 * - the call stack stays at constant depth however long a chain of nodes is;
 * - no handler is re-entered: each delivery runs to completion before the next;
 * - messages on one connection arrive in the order they were sent, and the
 *   order across connections is deterministic (first in, first out).
 *
 * A message sent from outside any delivery (a source starting, a timer) drains
 * the queue before `send` returns, so a flow is still synchronous from the
 * outside. Enqueueing and dequeueing are O(1): the queue advances an index and
 * compacts the delivered prefix once it is at least half of the array.
 */
class DeliveryQueue {
  private readonly pending: (Delivery | undefined)[] = [];
  private head = 0;
  private draining = false;

  /**
   * Delivers `message` to `port` now, or after the delivery that is running.
   * With a `timer`, the delivery is timed: because what the receivers send is
   * queued rather than delivered in a nested call, the time measured is the
   * receiving handlers' own work.
   */
  deliver(port: Port, message: unknown, timer?: DeliveryTimer): void {
    this.pending.push({ port, message, timer });
    if (this.draining) {
      return;
    }
    this.draining = true;
    try {
      for (let next = this.take(); next !== undefined; next = this.take()) {
        if (next.timer === undefined) {
          next.port.send(next.message);
        } else {
          const start = performance.now();
          next.port.send(next.message);
          next.timer(performance.now() - start);
        }
      }
    } finally {
      this.pending.length = 0;
      this.head = 0;
      this.draining = false;
    }
  }

  /** Removes and returns the oldest pending delivery, or `undefined` when there is none. */
  private take(): Delivery | undefined {
    const next = this.pending[this.head];
    if (next === undefined) {
      return undefined;
    }
    this.pending[this.head] = undefined;
    this.head += 1;
    if (this.head >= COMPACT_AFTER && this.head * 2 >= this.pending.length) {
      this.pending.splice(0, this.head);
      this.head = 0;
    }
    return next;
  }
}

/** The one queue every connection delivers through. */
export const deliveries = new DeliveryQueue();
