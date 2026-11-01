import { describe, expect, it } from 'vitest';
import type { INodeDeliveryEvent } from '@hlang-org/editor-core';
import { RunTrace, involves } from './run-trace';
import type { LiveSignalStoreDeps } from './live-signal-store';

/** A clock and a frame scheduler the test advances by hand. */
function fakeDeps(): LiveSignalStoreDeps & { time: number; frames: Map<number, () => void>; frame(): void } {
  let next = 1;
  const deps = {
    time: 0,
    frames: new Map<number, () => void>(),
    now: (): number => deps.time,
    schedule: (callback: () => void): number => {
      const handle = next;
      next += 1;
      deps.frames.set(handle, callback);
      return handle;
    },
    cancel: (handle: number): void => {
      deps.frames.delete(handle);
    },
    frame: (): void => {
      const due = [...deps.frames.values()];
      deps.frames.clear();
      for (const callback of due) callback();
    },
  };
  return deps;
}

function delivery(from: string, to: string, message: unknown, duration = 1): INodeDeliveryEvent {
  return { sourceNodeId: from, sourcePortId: 'out', targetNodeId: to, targetPortId: 'in', message, duration };
}

describe('RunTrace', () => {
  it('logs deliveries and errors in order, timed from the start of the run', () => {
    const deps = fakeDeps();
    const trace = new RunTrace({ deps });
    deps.time = 1000;
    trace.start();
    deps.time = 1005;
    trace.recordDelivery(delivery('a', 'b', 1, 0.25));
    deps.time = 1012;
    trace.recordError({ nodeId: 'b', error: 'boom' });

    expect(trace.entries()).toEqual([
      { kind: 'delivery', seq: 1, at: 5, sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'b', targetPortId: 'in', message: 1, duration: 0.25 },
      { kind: 'error', seq: 2, at: 12, nodeId: 'b', error: 'boom' },
    ]);
  });

  it('keeps per-node statistics', () => {
    const trace = new RunTrace({ deps: fakeDeps() });
    trace.start();
    trace.recordDelivery(delivery('a', 'b', 'x', 2));
    trace.recordDelivery(delivery('a', 'b', 'y', 6));
    trace.recordError({ nodeId: 'b', error: 'e' });

    expect(trace.statsOf('a')).toEqual({ received: 0, sent: 2, errors: 0, totalMs: 0, maxMs: 0, lastReceived: undefined, lastSent: 'y', dropped: 0, finished: false });
    expect(trace.statsOf('b')).toEqual({ received: 2, sent: 0, errors: 1, totalMs: 8, maxMs: 6, lastReceived: 'y', lastSent: undefined, dropped: 0, finished: false });
    expect(trace.statsOf('c')).toBeUndefined();
  });

  it('keeps only the most recent entries and counts what it dropped', () => {
    const trace = new RunTrace({ capacity: 3, deps: fakeDeps() });
    trace.start();
    for (let i = 1; i <= 5; i += 1) {
      trace.recordDelivery(delivery('a', 'b', i));
    }

    expect(trace.entries().map(entry => entry.seq)).toEqual([3, 4, 5]);
    expect(trace.dropped).toBe(2);
    // Statistics count everything, not just what the log still holds.
    expect(trace.statsOf('b')?.received).toBe(5);
  });

  it('notifies once per frame however many events arrive, and only on change', () => {
    const deps = fakeDeps();
    const trace = new RunTrace({ deps });
    let calls = 0;
    trace.subscribe(() => {
      calls += 1;
    });
    trace.start();
    const before = trace.getVersion();
    trace.recordDelivery(delivery('a', 'b', 1));
    trace.recordDelivery(delivery('a', 'b', 2));
    expect(calls).toBe(0);
    expect(trace.getVersion()).toBe(before);

    deps.frame();
    expect(calls).toBe(1);
    expect(trace.getVersion()).toBe(before + 1);

    deps.frame();
    expect(calls).toBe(1);
  });

  it('returns the same entries array until something changes', () => {
    const deps = fakeDeps();
    const trace = new RunTrace({ deps });
    trace.start();
    trace.recordDelivery(delivery('a', 'b', 1));
    deps.frame();
    const first = trace.entries();
    expect(trace.entries()).toBe(first);
    trace.recordDelivery(delivery('a', 'b', 2));
    deps.frame();
    expect(trace.entries()).not.toBe(first);
  });

  it('reads current entries before the frame that notifies', () => {
    const trace = new RunTrace({ deps: fakeDeps() });
    trace.start();
    trace.recordDelivery(delivery('a', 'b', 1));
    expect(trace.entries()).toHaveLength(1);
    trace.recordDelivery(delivery('a', 'b', 2));
    expect(trace.entries()).toHaveLength(2);
  });

  it('clears the log and statistics, and a new start does too', () => {
    const deps = fakeDeps();
    const trace = new RunTrace({ capacity: 1, deps });
    trace.start();
    trace.recordDelivery(delivery('a', 'b', 1));
    trace.recordDelivery(delivery('a', 'b', 2));
    trace.clear();
    expect([trace.entries(), trace.statsOf('b'), trace.dropped]).toEqual([[], undefined, 0]);

    trace.recordDelivery(delivery('a', 'b', 3));
    trace.start();
    expect(trace.entries()).toEqual([]);
  });

  it('stops notifying a listener that unsubscribed', () => {
    const deps = fakeDeps();
    const trace = new RunTrace({ deps });
    let calls = 0;
    const unsubscribe = trace.subscribe(() => {
      calls += 1;
    });
    unsubscribe();
    trace.recordDelivery(delivery('a', 'b', 1));
    deps.frame();
    expect(calls).toBe(0);
  });

  it('rejects a capacity that cannot hold an entry', () => {
    expect(() => new RunTrace({ capacity: 0 })).toThrow('capacity must be a positive integer');
  });
});

describe('involves', () => {
  it('matches a delivery by either end and an error by its node', () => {
    const trace = new RunTrace({ deps: fakeDeps() });
    trace.recordDelivery(delivery('a', 'b', 1));
    trace.recordError({ nodeId: 'c', error: 'e' });
    const [sent, failed] = trace.entries();
    expect([sent, failed].map(entry => entry !== undefined && involves(entry, 'a'))).toEqual([true, false]);
    expect([sent, failed].map(entry => entry !== undefined && involves(entry, 'b'))).toEqual([true, false]);
    expect([sent, failed].map(entry => entry !== undefined && involves(entry, 'c'))).toEqual([false, true]);
  });
});

describe('RunTrace end of stream and drops (RFC 0001)', () => {
  it('logs ended inputs, finished nodes and dropped messages, and counts them per node', () => {
    const trace = new RunTrace({ deps: fakeDeps() });
    trace.start();
    trace.recordDropped({ sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'b', targetPortId: 'in', message: 7 });
    trace.recordEnded({ nodeId: 'b', portId: 'in' });
    trace.recordFinished({ nodeId: 'b' });

    expect(trace.entries().map(entry => entry.kind)).toEqual(['dropped', 'ended', 'finished']);
    expect(trace.statsOf('b')).toMatchObject({ dropped: 1, finished: true });
    expect(trace.statsOf('a')).toMatchObject({ dropped: 0, finished: false });
  });

  it('matches the new entries to their nodes', () => {
    const trace = new RunTrace({ deps: fakeDeps() });
    trace.recordDropped({ sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'b', targetPortId: 'in', message: 7 });
    trace.recordEnded({ nodeId: 'c', portId: 'in' });
    trace.recordFinished({ nodeId: 'd' });
    const [dropped, ended, finished] = trace.entries();
    expect([dropped, ended, finished].map(entry => entry !== undefined && involves(entry, 'a'))).toEqual([true, false, false]);
    expect([dropped, ended, finished].map(entry => entry !== undefined && involves(entry, 'c'))).toEqual([false, true, false]);
    expect([dropped, ended, finished].map(entry => entry !== undefined && involves(entry, 'd'))).toEqual([false, false, true]);
  });
});
