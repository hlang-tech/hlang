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

