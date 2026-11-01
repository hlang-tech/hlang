/**
 * `RunTrace` — what a running graph did: a bounded log of every delivery and
 * error, and per-node statistics (messages in and out, errors, time spent,
 * the latest values). It is fed from an execution handle's `onDelivery` and
 * `onError` (see `useRunTrace`) and read by the run log and the inspector.
 *
 * Like `LiveSignalStore`, it records synchronously and notifies at most once
 * per frame, so a flow delivering thousands of messages a second costs one
 * render per frame. The log is a ring buffer: memory stays bounded however
 * long the run, while the statistics keep counting everything.
 */

import type { INodeDeliveryEvent, INodeErrorEvent } from '@hlang-org/editor-core';
import { defaultLiveDeps } from './live-signal-store';
import type { LiveSignalStoreDeps } from './live-signal-store';

/** How many log entries a trace keeps unless told otherwise. */
export const RUN_LOG_CAPACITY = 500;

/** A message delivered on a connection. `at` is milliseconds since the run started. */
export interface RunDeliveryEntry {
  readonly kind: 'delivery';
  readonly seq: number;
  readonly at: number;
  readonly sourceNodeId: string;
  readonly sourcePortId: string;
  readonly targetNodeId: string;
  readonly targetPortId: string;
  readonly message: unknown;
  /** How long the receiving node's handlers took, in milliseconds. */
  readonly duration: number;
}

/** A node error. `at` is milliseconds since the run started. */
export interface RunErrorEntry {
  readonly kind: 'error';
  readonly seq: number;
  readonly at: number;
  readonly nodeId: string;
  readonly error: unknown;
}

export type RunLogEntry = RunDeliveryEntry | RunErrorEntry;

/** One node's activity during the run. */
export interface NodeRunSummary {
  readonly received: number;
  readonly sent: number;
  readonly errors: number;
  /** Time spent handling what it received, in milliseconds: in total and the longest once. */
  readonly totalMs: number;
  readonly maxMs: number;
  readonly lastReceived: unknown;
  readonly lastSent: unknown;
}

export interface RunTraceOptions {
  /** How many log entries to keep. Default `RUN_LOG_CAPACITY`. */
  readonly capacity?: number;
  /** Clock and frame scheduler; injected in tests. */
  readonly deps?: LiveSignalStoreDeps;
}

interface MutableStats {
  received: number;
  sent: number;
  errors: number;
  totalMs: number;
  maxMs: number;
  lastReceived: unknown;
  lastSent: unknown;
}

type Listener = () => void;

export class RunTrace {
  private readonly capacity: number;
  private readonly deps: LiveSignalStoreDeps;
  /** The log as a ring: `ring[(head + i) % capacity]` is the i-th oldest entry. */
  private readonly ring: RunLogEntry[] = [];
  private head = 0;
  private droppedCount = 0;
  private seq = 0;
  private startedAt = 0;
  private readonly stats = new Map<string, MutableStats>();
  private readonly listeners = new Set<Listener>();
  /** Bumped by every change; the entries cache follows it. */
  private revision = 0;
  /** Bumped once per notified frame; what subscribers compare. */
  private version = 0;
  private frame: number | null = null;
  /** The entries as an array, rebuilt only after a change. */
  private entriesCache: readonly RunLogEntry[] = [];
  private entriesRevision = -1;

  constructor(options: RunTraceOptions = {}) {
    const capacity = options.capacity ?? RUN_LOG_CAPACITY;
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError('RunTrace capacity must be a positive integer.');
    }
    this.capacity = capacity;
    this.deps = options.deps ?? defaultLiveDeps;
  }

  /** Begins a run: clears everything and times entries from now. */
  start(): void {
    this.clear();
    this.startedAt = this.deps.now();
  }

  /** Forgets the log and the statistics. */
  clear(): void {
    this.ring.length = 0;
    this.head = 0;
    this.droppedCount = 0;
    this.stats.clear();
    this.changed();
  }

  recordDelivery(event: INodeDeliveryEvent): void {
    this.append({
      kind: 'delivery',
      seq: this.nextSeq(),
      at: this.elapsed(),
      sourceNodeId: event.sourceNodeId,
      sourcePortId: event.sourcePortId,
      targetNodeId: event.targetNodeId,
      targetPortId: event.targetPortId,
      message: event.message,
      duration: event.duration,
    });
    const source = this.statsFor(event.sourceNodeId);
    source.sent += 1;
    source.lastSent = event.message;
    const target = this.statsFor(event.targetNodeId);
    target.received += 1;
    target.totalMs += event.duration;
    target.maxMs = Math.max(target.maxMs, event.duration);
    target.lastReceived = event.message;
    this.changed();
  }

  recordError(event: INodeErrorEvent): void {
    this.append({ kind: 'error', seq: this.nextSeq(), at: this.elapsed(), nodeId: event.nodeId, error: event.error });
    this.statsFor(event.nodeId).errors += 1;
    this.changed();
  }

  /** The log, oldest first. The same array is returned until something changes. */
  entries(): readonly RunLogEntry[] {
    if (this.entriesRevision !== this.revision) {
      const count = this.ring.length;
      const ordered: RunLogEntry[] = [];
      for (let i = 0; i < count; i += 1) {
        const entry = this.ring[(this.head + i) % count];
        if (entry !== undefined) {
          ordered.push(entry);
        }
      }
      this.entriesCache = ordered;
      this.entriesRevision = this.revision;
    }
    return this.entriesCache;
  }

  /** A node's statistics, or `undefined` when it has done nothing this run. */
  statsOf(nodeId: string): NodeRunSummary | undefined {
    const stats = this.stats.get(nodeId);
    return stats === undefined ? undefined : { ...stats };
  }

  /** How many entries the log has let go of to stay within its capacity. */
  get dropped(): number {
    return this.droppedCount;
  }

  /** Changes once per notified frame; a snapshot for `useSyncExternalStore`. */
  getVersion(): number {
    return this.version;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private append(entry: RunLogEntry): void {
    if (this.ring.length < this.capacity) {
      this.ring.push(entry);
      return;
    }
    this.ring[this.head] = entry;
    this.head = (this.head + 1) % this.capacity;
    this.droppedCount += 1;
  }

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  private elapsed(): number {
    return this.deps.now() - this.startedAt;
  }

  private statsFor(nodeId: string): MutableStats {
    let stats = this.stats.get(nodeId);
    if (stats === undefined) {
      stats = { received: 0, sent: 0, errors: 0, totalMs: 0, maxMs: 0, lastReceived: undefined, lastSent: undefined };
      this.stats.set(nodeId, stats);
    }
    return stats;
  }

  /** Schedules one notification for the next frame, however many changes come before it. */
  private changed(): void {
    this.revision += 1;
    if (this.frame !== null) {
      return;
    }
    this.frame = this.deps.schedule(() => {
      this.frame = null;
      this.version += 1;
      for (const listener of [...this.listeners]) {
        listener();
      }
    });
  }
}

/** Whether `entry` concerns `nodeId`: either end of a delivery, or the node of an error. */
export function involves(entry: RunLogEntry, nodeId: string): boolean {
  return entry.kind === 'error' ? entry.nodeId === nodeId : entry.sourceNodeId === nodeId || entry.targetNodeId === nodeId;
}
