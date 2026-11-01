/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { AddNodeCommand, ConnectCommand, createEditorCore } from '@hlang-org/editor-core';
import type { NodeDescriptor } from '@hlang-org/editor-core';
import { useEdgeBounds } from './useEdgeBounds';

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

function connected() {
  const core = createEditorCore();
  core.registry.register(SOURCE);
  core.registry.register(SINK);
  const source = core.registry.createNode('src', { x: 0, y: 0 });
  const sink = core.registry.createNode('sink', { x: 1, y: 0 });
  core.commands.execute(new AddNodeCommand(source));
  core.commands.execute(new AddNodeCommand(sink));
  core.commands.execute(new ConnectCommand('e1', { nodeId: source.id, portId: 'Output' }, { nodeId: sink.id, portId: 'Input' }));
  return core;
}

describe('useEdgeBounds', () => {
  it('reads the edge, sets its bounds as an undoable step, and follows undo', () => {
    const core = connected();
    const { result } = renderHook(() => useEdgeBounds(core, 'e1'));
    expect(result.current.edge?.capacity).toBeUndefined();

    act(() => {
      result.current.setBounds({ capacity: 3 });
    });
    expect(result.current.edge?.capacity).toBe(3);

    act(() => {
      core.history.undo();
    });
    expect(result.current.edge?.capacity).toBeUndefined();
  });

  it('reports a removed edge, and does nothing without one', () => {
    const core = connected();
    const initialProps: { id: string | undefined } = { id: 'e1' };
    const { result, rerender } = renderHook(({ id }: { id: string | undefined }) => useEdgeBounds(core, id), { initialProps });
    act(() => {
      core.model.removeEdge('e1');
      core.events.emit({ kind: 'edgeRemoved', edgeId: 'e1' });
    });
    expect(result.current.edge).toBeUndefined();

    rerender({ id: undefined });
    act(() => {
      result.current.setBounds({ capacity: 2 });
    });
    expect(result.current.edge).toBeUndefined();
  });
});
