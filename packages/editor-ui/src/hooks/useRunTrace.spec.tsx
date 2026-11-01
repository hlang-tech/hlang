/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import type { IDisposable, IExecutionHandle, INodeDeliveryEvent, INodeDroppedEvent, INodeEndedEvent, INodeErrorEvent, INodeFinishedEvent } from '@hlang-org/editor-core';
import { RunTrace } from '../live/run-trace';
import { useRunTrace } from './useRunTrace';

afterEach(cleanup);

/** A clock that never moves and frames that never run: the test reads the trace directly. */
function stillTrace(): RunTrace {
  return new RunTrace({ deps: { now: () => 0, schedule: () => 1, cancel: () => undefined } });
}

type FakeHandle = IExecutionHandle & {
  deliver(event: INodeDeliveryEvent): void;
  error(event: INodeErrorEvent): void;
  listeners(): number;
};

function fakeHandle(traced: boolean): FakeHandle {
  const deliveries = new Set<(event: INodeDeliveryEvent) => void>();
  const errors = new Set<(event: INodeErrorEvent) => void>();
  const subscribe = <T,>(set: Set<(event: T) => void>, listener: (event: T) => void): IDisposable => {
    set.add(listener);
    return { dispose: () => set.delete(listener) };
  };
  return {
    onActivity: () => ({ dispose: () => undefined }),
    onError: listener => subscribe(errors, listener),
    ...(traced ? { onDelivery: (listener: (event: INodeDeliveryEvent) => void) => subscribe(deliveries, listener) } : {}),
    dispose: () => undefined,
    deliver: event => {
      for (const listener of deliveries) listener(event);
    },
    error: event => {
      for (const listener of errors) listener(event);
    },
    listeners: () => deliveries.size + errors.size,
  };
}

const EVENT: INodeDeliveryEvent = {
  sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'b', targetPortId: 'in', message: 1, duration: 2,
};

describe('useRunTrace', () => {
  it('records the deliveries and errors of the running handle', () => {
    const trace = stillTrace();
    const handle = fakeHandle(true);
    renderHook(() => {
      useRunTrace(trace, handle);
    });
    handle.deliver(EVENT);
    handle.error({ nodeId: 'b', error: 'x' });

    expect(trace.entries().map(entry => entry.kind)).toEqual(['delivery', 'error']);
  });

  it('starts a new run for a new handle, and keeps the log when the run stops', () => {
    const trace = stillTrace();
    const first = fakeHandle(true);
    const second = fakeHandle(true);
    const initialProps: { handle: IExecutionHandle | undefined } = { handle: first };
    const { rerender } = renderHook(({ handle }: { handle: IExecutionHandle | undefined }) => {
      useRunTrace(trace, handle);
    }, { initialProps });
    first.deliver(EVENT);

    rerender({ handle: undefined });
    expect(trace.entries()).toHaveLength(1);
    expect(first.listeners()).toBe(0);

    rerender({ handle: second });
    expect(trace.entries()).toHaveLength(0);
  });

  it('still records errors from a handle that cannot trace', () => {
    const trace = stillTrace();
    const handle = fakeHandle(false);
    renderHook(() => {
      useRunTrace(trace, handle);
    });
    handle.error({ nodeId: 'b', error: 'x' });

    expect(trace.entries()).toEqual([{ kind: 'error', seq: 1, at: 0, nodeId: 'b', error: 'x' }]);
  });

  it('records end of stream and drops from a handle that reports them', () => {
    const trace = stillTrace();
    const listeners: { ended?: (e: INodeEndedEvent) => void; finished?: (e: INodeFinishedEvent) => void; dropped?: (e: INodeDroppedEvent) => void } = {};
    const handle: IExecutionHandle = {
      onActivity: () => ({ dispose: () => undefined }),
      onError: () => ({ dispose: () => undefined }),
      onEnded: listener => {
        listeners.ended = listener;
        return { dispose: () => undefined };
      },
      onFinished: listener => {
        listeners.finished = listener;
        return { dispose: () => undefined };
      },
      onDropped: listener => {
        listeners.dropped = listener;
        return { dispose: () => undefined };
      },
      dispose: () => undefined,
    };
    renderHook(() => {
      useRunTrace(trace, handle);
    });
    listeners.dropped?.({ sourceNodeId: 'a', sourcePortId: 'out', targetNodeId: 'b', targetPortId: 'in', message: 1 });
    listeners.ended?.({ nodeId: 'b', portId: 'in' });
    listeners.finished?.({ nodeId: 'b' });
    expect(trace.entries().map(entry => entry.kind)).toEqual(['dropped', 'ended', 'finished']);
  });
});
