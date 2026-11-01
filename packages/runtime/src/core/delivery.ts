import type Port from '../base/port';
import { portInternals } from '../base/port';

/** Called after a delivery with how long it took, in milliseconds. */
export type DeliveryTimer = (duration: number) => void;

/**
 * How a flow shares its thread: it delivers for at most `budgetMs` at a time,
 * then yields to the rest of the program (rendering, input, other requests,
 * timers) and carries on in a later task.
 */
export interface SliceOptions {
  /** How long one slice of deliveries may run, in milliseconds. Default `DEFAULT_SLICE_BUDGET_MS`. */
  readonly budgetMs?: number;
  /** The clock the budget is measured with. Default `performance.now`. */
  readonly now?: () => number;
  /** Schedules the next slice in a later task. Default `yieldToRuntime`. */
  readonly yieldTo?: (resume: () => void) => void;
}

/** The slice budget unless a flow sets another: React's scheduler yields after 5 ms, too. */
export const DEFAULT_SLICE_BUDGET_MS = 5;

interface Slicing {
  readonly budgetMs: number;
  readonly now: () => number;
  readonly yieldTo: (resume: () => void) => void;
}

/** Called once every handler a delivery started has settled (RFC 0001). */
export type DeliveryDone = () => void;

/** One message on its way to one input port. */
interface Delivery {
  readonly port: Port;
  readonly message: unknown;
  readonly timer: DeliveryTimer | undefined;
  readonly done: DeliveryDone | undefined;
}

/** Work to run in its turn, after everything queued before it (an end of stream). */
interface Task {
  readonly port: undefined;
  readonly run: () => void;
}

type Entry = Delivery | Task;

/** Below this many delivered entries, the queue is not worth compacting. */
const COMPACT_AFTER = 1024;

function isTaskScheduler(value: unknown): value is (callback: () => void) => unknown {
  return typeof value === 'function';
}

/** Resumes waiting for the shared channel, oldest first (browsers, Deno, workers). */
const channelQueue: (() => void)[] = [];
let channel: MessageChannel | undefined;

/**
 * Runs `resume` in a later macrotask, in whatever JavaScript runtime this is:
 * `setImmediate` where it exists (Node.js, Bun), which runs after pending I/O
 * and never keeps a process alive by itself; otherwise a `MessageChannel`
 * message (browsers, Deno, workers), which is not throttled the way nested
 * `setTimeout(0)` calls are; otherwise `setTimeout`. The channel listens only
 * while something is waiting, so it never keeps a program running either.
 */
export function yieldToRuntime(resume: () => void): void {
  const immediate: unknown = Reflect.get(globalThis, 'setImmediate');
  if (isTaskScheduler(immediate)) {
    immediate(resume);
    return;
  }
  if (typeof MessageChannel === 'function') {
    channel ??= new MessageChannel();
    const port = channel.port1;
    channelQueue.push(resume);
    port.onmessage = () => {
      const next = channelQueue.shift();
      if (channelQueue.length === 0) {
        port.onmessage = null;
      }
      next?.();
    };
    channel.port2.postMessage(null);
    return;
  }
  setTimeout(resume, 0);
}

function slicing(options: SliceOptions | undefined): Slicing | undefined {
  if (options === undefined) {
    return undefined;
  }
  const budgetMs = options.budgetMs ?? DEFAULT_SLICE_BUDGET_MS;
  if (!Number.isFinite(budgetMs) || budgetMs < 0) {
    throw new RangeError('Flow slice budgetMs must be a finite number of milliseconds, 0 or more.');
  }
  return {
    budgetMs,
    now: options.now ?? (() => performance.now()),
    yieldTo: options.yieldTo ?? yieldToRuntime,
  };
}

/**
 * A flow's deliveries: one FIFO queue, drained by a single loop (a
 * trampoline: the drain loop of RxJava and Reactor, RxJS's `queueScheduler`).
 * Each flow has its own, so flows never wait for one another.
 *
 * A message sent while a delivery is running is queued, not delivered in a
 * nested call, so:
 *
 * - the call stack stays at constant depth however long a chain of nodes is;
 * - no handler is re-entered: each delivery runs to completion before the next;
 * - messages on one connection arrive in the order they were sent, and the
 *   order across connections is deterministic (first in, first out).
 *
 * Without slicing, a message sent from outside any delivery (a source
 * starting, a timer) drains the queue before `send` returns. With slicing,
 * the loop stops once a slice has spent its budget and resumes in a later
 * task, in the same order; messages sent meanwhile wait their turn. Work
 * that never ends by itself, such as a feedback loop with no asynchronous
 * step, then shares the thread instead of taking it, and can be disposed.
 *
 * Enqueueing and dequeueing are O(1): the queue advances an index and
 * compacts the delivered prefix once it is at least half of the array.
 */
export class DeliveryQueue {
  private readonly pending: (Entry | undefined)[] = [];
  private head = 0;
  private draining = false;
  private closed = false;
  private readonly slicing: Slicing | undefined;
  /**
   * When the current slice began, or `undefined` between slices. A slice is
   * one task's share of the thread: it starts with the task's first delivery
   * and lasts until its budget is spent or the task ends, however many
   * separate sends (a source looping over a million values) the task makes.
   */
  private sliceStart: number | undefined = undefined;

  constructor(slice?: SliceOptions) {
    this.slicing = slicing(slice);
  }

  /**
   * Delivers `message` to `port` now, or after the deliveries before it.
   * With a `timer`, the delivery is timed: because what the receivers send is
   * queued rather than delivered in a nested call, the time measured is the
   * receiving handlers' own work. With `done`, the delivery is tracked: `done`
   * runs once every handler it started has settled, including asynchronous
   * ones, and the timer measures until then.
   */
  deliver(port: Port, message: unknown, timer?: DeliveryTimer, done?: DeliveryDone): void {
    // The hot path: most deliveries are sent by a handler while the queue
    // drains, and only need to be queued.
    this.pending.push({ port, message, timer, done });
    if (this.draining) {
      return;
    }
    if (this.closed) {
      this.pending.length = 0;
      return;
    }
    if (this.slicing !== undefined && this.sliceSpent(this.slicing)) {
      // This task has had its share: what it sends waits for the next slice.
      this.pause(this.slicing);
      return;
    }
    this.drain();
  }

  /** Runs `run` in its turn: after every delivery queued before it, first in first out. */
  schedule(run: () => void): void {
    this.pending.push({ port: undefined, run });
    if (this.draining) {
      return;
    }
    if (this.closed) {
      this.pending.length = 0;
      return;
    }
    if (this.slicing !== undefined && this.sliceSpent(this.slicing)) {
      this.pause(this.slicing);
      return;
    }
    this.drain();
  }

  /** Drops everything queued; later deliveries and a scheduled slice do nothing. */
  close(): void {
    this.closed = true;
    this.pending.length = 0;
    this.head = 0;
  }

  /** Whether the current task's slice has used its budget; starts a slice (not spent) if none is running. */
  private sliceSpent(slicing: Slicing): boolean {
    const now = slicing.now();
    if (this.sliceStart === undefined) {
      // A new slice: it delivers at least one message before its budget
      // counts, so every slice makes progress (as React's scheduler does).
      this.sliceStart = now;
      // The slice ends with the task that started it.
      queueMicrotask(() => {
        this.sliceStart = undefined;
      });
      return false;
    }
    return now - this.sliceStart >= slicing.budgetMs;
  }

  /** Stops delivering until a later task, which starts a new slice. */
  private pause(slicing: Slicing): void {
    this.draining = true;
    slicing.yieldTo(() => {
      if (this.closed) {
        return;
      }
      this.sliceStart = undefined;
      this.drainSlice(slicing);
    });
  }

  private drain(): void {
    if (this.slicing === undefined) {
      this.drainAll();
    } else {
      this.drainSlice(this.slicing);
    }
  }

  /** Delivers until the queue is empty: the synchronous loop, with nothing else in its way. */
  private drainAll(): void {
    this.draining = true;
    try {
      for (let next = this.take(); next !== undefined; next = this.take()) {
        this.deliverOne(next);
      }
    } finally {
      this.reset();
    }
  }

  /**
   * Delivers until the queue is empty or the slice has spent its budget, then
   * schedules the rest. A dispose during a delivery empties the queue, which
   * ends the loop.
   */
  private drainSlice(slicing: Slicing): void {
    this.draining = true;
    this.sliceSpent(slicing);
    let paused = false;
    try {
      for (let next = this.take(); next !== undefined; next = this.take()) {
        this.deliverOne(next);
        if (this.head < this.pending.length && this.sliceSpent(slicing)) {
          paused = true;
          this.pause(slicing);
          return;
        }
      }
    } finally {
      if (!paused) {
        this.reset();
      }
    }
  }

  private deliverOne(next: Entry): void {
    if (next.port === undefined) {
      next.run();
      return;
    }
    if (next.done !== undefined) {
      this.deliverTracked(next, next.done);
      return;
    }
    if (next.timer === undefined) {
      next.port.send(next.message);
    } else {
      const begun = performance.now();
      next.port.send(next.message);
      next.timer(performance.now() - begun);
    }
  }

  /** A delivery whose handlers may work asynchronously: `done` runs when they have all settled. */
  private deliverTracked(next: Delivery, done: DeliveryDone): void {
    const { timer } = next;
    const begun = timer === undefined ? 0 : performance.now();
    const settled = portInternals.deliverTracked(next.port, next.message);
    const finish = (): void => {
      timer?.(performance.now() - begun);
      done();
    };
    if (settled === undefined) {
      finish();
    } else {
      void settled.then(finish);
    }
  }

  private reset(): void {
    this.pending.length = 0;
    this.head = 0;
    this.draining = false;
  }

  /** Removes and returns the oldest pending delivery, or `undefined` when there is none. */
  private take(): Entry | undefined {
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
