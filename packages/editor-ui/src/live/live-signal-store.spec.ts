import { describe, expect, it } from 'vitest';
import { LiveSignalStore } from './live-signal-store';
import type { LiveSignalStoreDeps } from './live-signal-store';

/** A clock and a frame scheduler the test advances by hand. */
function fakeDeps(): LiveSignalStoreDeps & { time: number; frames: Map<number, () => void>; tick(ms: number): void } {
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
    /** Advance the clock and run the frames that were due. */
    tick: (ms: number): void => {
      deps.time += ms;
      const due = [...deps.frames.values()];
      deps.frames.clear();
      for (const frame of due) frame();
    },
  };
  return deps;
}

describe('LiveSignalStore', () => {
  it('lights a node and the edges from the port it sent on, then lets them go idle', () => {
    const deps = fakeDeps();
    const store = new LiveSignalStore(deps);
    store.setEdgeIndex([
      { id: 'e1', sourceNodeId: 'a', sourcePortId: 'out', isError: false },
      { id: 'e2', sourceNodeId: 'a', sourcePortId: 'other', isError: false },
    ]);

    store.markActivity('a', 'out');
    expect(store.getNodeState('a')).toBe('active');
    expect(store.isEdgeFlowing('e1')).toBe(true);
    expect(store.isEdgeFlowing('e2')).toBe(false);

    deps.tick(701);
    expect(store.getNodeState('a')).toBe('idle');
    expect(store.isEdgeFlowing('e1')).toBe(false);
  });

  it('keeps an error for the run, over activity', () => {
    const store = new LiveSignalStore(fakeDeps());
    store.markActivity('a', 'out');
    store.markError('a');
    expect(store.getNodeState('a')).toBe('error');
  });

  it('notifies a subscriber only when its own state changes, and stops when unsubscribed', () => {
    const deps = fakeDeps();
    const store = new LiveSignalStore(deps);
    store.setEdgeIndex([{ id: 'e1', sourceNodeId: 'a', sourcePortId: 'out', isError: false }]);
    let nodeCalls = 0;
    let otherCalls = 0;
    let edgeCalls = 0;
    store.subscribeNode('a', () => {
      nodeCalls += 1;
    });
    const unsubscribeOther = store.subscribeNode('b', () => {
      otherCalls += 1;
    });
    store.subscribeEdge('e1', () => {
      edgeCalls += 1;
    });

    // Notifications are delivered on the next frame, in step with painting.
    store.markActivity('a', 'out');
    expect([nodeCalls, edgeCalls]).toEqual([0, 0]);
    deps.tick(0);
    expect([nodeCalls, edgeCalls]).toEqual([1, 1]);
    expect(otherCalls).toBe(1); // b's first state, idle, is reported once
    store.markActivity('a', 'out'); // still active: no change, no call
    deps.tick(0);
    expect([nodeCalls, edgeCalls]).toEqual([1, 1]);
    deps.tick(701); // back to idle
    expect([nodeCalls, edgeCalls]).toEqual([2, 2]);
    expect(otherCalls).toBe(1);

    unsubscribeOther();
    store.markError('b');
    deps.tick(0);
    expect(otherCalls).toBe(1);
  });

  it('stops scheduling frames once everything is idle', () => {
    const deps = fakeDeps();
    const store = new LiveSignalStore(deps);
    store.subscribeNode('a', () => undefined);
    store.markActivity('a', 'out');
    expect(deps.frames.size).toBe(1);
    deps.tick(100);
    expect(deps.frames.size).toBe(1); // still active: next frame armed
    deps.tick(700);
    expect(deps.frames.size).toBe(0); // quiet: the loop ended
  });

  it('clears every state on reset and tells the subscribers', () => {
    const deps = fakeDeps();
    const store = new LiveSignalStore(deps);
    let calls = 0;
    store.subscribeNode('a', () => {
      calls += 1;
    });
    store.markError('a');
    deps.tick(0);
    expect(calls).toBe(1);
    store.reset();
    expect(store.getNodeState('a')).toBe('idle');
    expect(calls).toBe(2);
    expect(deps.frames.size).toBe(0);
  });

  it('coalesces every signal in a frame into one notification per subscriber, on the next frame', () => {
    const deps = fakeDeps();
    const store = new LiveSignalStore(deps);
    store.setEdgeIndex([{ id: 'e1', sourceNodeId: 'a', sourcePortId: 'out', isError: false }]);
    let nodeCalls = 0;
    let edgeCalls = 0;
    store.subscribeNode('a', () => {
      nodeCalls += 1;
    });
    store.subscribeEdge('e1', () => {
      edgeCalls += 1;
    });

    store.markActivity('a', 'out');
    deps.tick(0);
    expect([nodeCalls, edgeCalls]).toEqual([1, 1]);

    // A busy stream: a thousand signals while the loop runs, then an error.
    for (let index = 0; index < 1000; index += 1) {
      store.markActivity('a', 'out');
    }
    store.markError('a');
    expect([nodeCalls, edgeCalls]).toEqual([1, 1]); // nothing until the frame
    deps.tick(16);
    expect([nodeCalls, edgeCalls]).toEqual([2, 1]); // a: active -> error, once
    expect(deps.frames.size).toBe(1); // one frame armed, never one per signal
  });
});


describe('LiveSignalStore#markDelivery', () => {
  const ab = { sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'b', targetPortId: 'in' };

  it('pulses the sender and the receiver for every delivered message, as it happens', () => {
    const store = new LiveSignalStore(fakeDeps());
    store.markDelivery(ab);
    store.markDelivery(ab);
    expect([store.getNodePulse('a'), store.getNodePulse('b'), store.getNodePulse('c')]).toEqual([2, 2, 0]);
    expect([store.getNodeState('a'), store.getNodeState('b')]).toEqual(['active', 'active']);
  });

  it('lights only the edge that carried the message', () => {
    const store = new LiveSignalStore(fakeDeps());
    store.setEdgeIndex([
      { id: 'to-b', sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'b', targetPortId: 'in', isError: false },
      { id: 'to-c', sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'c', targetPortId: 'in', isError: false },
    ]);
    store.markDelivery(ab);
    expect([store.getEdgePulse('to-b'), store.getEdgePulse('to-c')]).toEqual([1, 0]);
    expect([store.isEdgeFlowing('to-b'), store.isEdgeFlowing('to-c')]).toEqual([true, false]);
  });

  it('notifies a node once for every frame in which it ran, so a faster node flashes more often', () => {
    // A 700 ms clock and a 1000 ms clock, each running for 7 s. Under the old
    // active-window rule the faster one never left its window and stopped
    // flashing, while the slower one flashed every second.
    const deps = fakeDeps();
    const store = new LiveSignalStore(deps);
    const flashes = { fast: 0, slow: 0 };
    store.subscribeNode('fast', () => {
      flashes.fast += 1;
    });
    store.subscribeNode('slow', () => {
      flashes.slow += 1;
    });
    const seen = { fast: 0, slow: 0 };
    for (let t = 16; t <= 7000; t += 16) {
      deps.tick(16);
      if (Math.floor(deps.time / 700) > Math.floor((deps.time - 16) / 700)) {
        store.markDelivery({ sourceNodeId: 'fast', sourcePortId: 'out', targetNodeId: 'x', targetPortId: 'in' });
      }
      if (Math.floor(deps.time / 1000) > Math.floor((deps.time - 16) / 1000)) {
        store.markDelivery({ sourceNodeId: 'slow', sourcePortId: 'out', targetNodeId: 'x', targetPortId: 'in' });
      }
      seen.fast = store.getNodePulse('fast');
      seen.slow = store.getNodePulse('slow');
    }
    deps.tick(16);
    expect(seen).toEqual({ fast: 9, slow: 6 });
    // At least one notification per execution (state changes may add more).
    expect(flashes.fast).toBeGreaterThanOrEqual(seen.fast);
    expect(flashes.slow).toBeGreaterThanOrEqual(seen.slow);
    expect(flashes.fast).toBeGreaterThan(flashes.slow);
  });

  it('forgets pulses on reset', () => {
    const store = new LiveSignalStore(fakeDeps());
    store.markDelivery(ab);
    store.reset();
    expect([store.getNodePulse('a'), store.getNodePulse('b')]).toEqual([0, 0]);
  });
});

describe('LiveSignalStore#markFinished (RFC 0001)', () => {
  it('shows a finished node as finished once its last flash has faded, and clears on reset', () => {
    const deps = fakeDeps();
    const store = new LiveSignalStore(deps);
    store.markDelivery({ sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'b', targetPortId: 'in' });
    store.markFinished('b');
    expect(store.getNodeState('b')).toBe('active');
    deps.tick(2000);
    expect(store.getNodeState('b')).toBe('finished');
    store.markError('b');
    expect(store.getNodeState('b')).toBe('error');
    store.reset();
    expect(store.getNodeState('b')).toBe('idle');
  });
});
