/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { AddNodeCommand, ConnectCommand, createEditorCore } from '@hlang-org/editor-core';
import type {
  EditorCore,
  IDisposable,
  IExecutionHandle,
  INodeActivityEvent,
  INodeErrorEvent,
  NodeDescriptor,
} from '@hlang-org/editor-core';
import { LiveSignalStore } from '../live/live-signal-store';
import { useLiveSignals } from './useLiveSignals';

// Testing Library unmounts after each test only through an explicit cleanup
// when the test API is imported rather than global.
afterEach(cleanup);

const dataType = { name: 'any', kind: 'unknown' as const };
const SOURCE: NodeDescriptor = {
  code: 'src', kind: 'R', displayName: 'Source', group: 'g', defaultParams: {}, runtimeResource: 'r',
  ports: [{ id: 'Output', direction: 'O', name: 'Output', dataType, isError: false }],
};
const SINK: NodeDescriptor = {
  code: 'sink', kind: 'W', displayName: 'Sink', group: 'g', defaultParams: {}, runtimeResource: 'r',
  ports: [{ id: 'Input', direction: 'I', name: 'Input', dataType, isError: false }],
};

/** A store whose clock never moves, so whatever is marked stays visible. */
function stillStore(): LiveSignalStore {
  return new LiveSignalStore({ now: () => 0, schedule: () => 1, cancel: () => undefined });
}

/** A handle the test emits signals through. */
function fakeHandle(): IExecutionHandle & { activity(event: INodeActivityEvent): void; error(event: INodeErrorEvent): void } {
  const activity = new Set<(event: INodeActivityEvent) => void>();
  const errors = new Set<(event: INodeErrorEvent) => void>();
  const subscribe = <T,>(set: Set<(event: T) => void>, listener: (event: T) => void): IDisposable => {
    set.add(listener);
    return { dispose: () => set.delete(listener) };
  };
  return {
    onActivity: (listener) => subscribe(activity, listener),
    onError: (listener) => subscribe(errors, listener),
    dispose: () => undefined,
    activity: (event) => {
      for (const listener of activity) listener(event);
    },
    error: (event) => {
      for (const listener of errors) listener(event);
    },
  };
}

function graph(): { core: EditorCore; source: string; sink: string } {
  const core = createEditorCore();
  core.registry.register(SOURCE);
  core.registry.register(SINK);
  const source = core.registry.createNode('src', { x: 0, y: 0 });
  const sink = core.registry.createNode('sink', { x: 100, y: 0 });
  core.commands.execute(new AddNodeCommand(source));
  core.commands.execute(new AddNodeCommand(sink));
  return { core, source: source.id, sink: sink.id };
}

describe('useLiveSignals', () => {
  it("feeds a run's activity and errors into the store, lighting the edges from the active port", () => {
    const { core, source, sink } = graph();
    const store = stillStore();
    const handle = fakeHandle();
    renderHook(() => {
      useLiveSignals(core, handle, store);
    });
    // An edge added after mounting is indexed too.
    core.commands.execute(new ConnectCommand('e1', { nodeId: source, portId: 'Output' }, { nodeId: sink, portId: 'Input' }));

    handle.activity({ nodeId: source, portId: 'Output' });
    handle.error({ nodeId: sink, error: new Error('x') });

    expect(store.getNodeState(source)).toBe('active');
    expect(store.isEdgeFlowing('e1')).toBe(true);
    expect(store.getNodeState(sink)).toBe('error');
  });

  it('clears the store when the run ends or the component unmounts', () => {
    const { core, source } = graph();
    const store = stillStore();
    const handle = fakeHandle();
    const initial: { current: IExecutionHandle | undefined } = { current: handle };
    const { rerender, unmount } = renderHook(({ current }: { current: IExecutionHandle | undefined }) => {
      useLiveSignals(core, current, store);
    }, { initialProps: initial });

    handle.error({ nodeId: source, error: 'x' });
    expect(store.getNodeState(source)).toBe('error');
    rerender({ current: undefined });
    expect(store.getNodeState(source)).toBe('idle');

    rerender({ current: handle });
    handle.error({ nodeId: source, error: 'y' });
    unmount();
    expect(store.getNodeState(source)).toBe('idle');
  });
});
