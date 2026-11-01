/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { AddNodeCommand, createEditorCore } from '@hlang-org/editor-core';
import type { EditorCore, NodeDescriptor } from '@hlang-org/editor-core';
import { useNodeParams } from './useNodeParams';

// Testing Library unmounts after each test only through an explicit cleanup
// when the test API is imported rather than global.
afterEach(cleanup);

const SCALE: NodeDescriptor = {
  code: 'scale',
  kind: 'T',
  displayName: 'Scale',
  group: 'process',
  ports: [],
  defaultParams: { factor: 2, label: 'x' },
  runtimeResource: 'r',
};

function coreWithNode(): { core: EditorCore; nodeId: string } {
  const core = createEditorCore();
  core.registry.register(SCALE);
  const node = core.registry.createNode('scale', { x: 0, y: 0 });
  core.commands.execute(new AddNodeCommand(node));
  return { core, nodeId: node.id };
}

describe('useNodeParams', () => {
  it('sets one param as an undoable command and re-reads the node', () => {
    const { core, nodeId } = coreWithNode();
    const { result } = renderHook(() => useNodeParams(core, nodeId));
    expect(result.current.node?.params).toEqual({ factor: 2, label: 'x' });

    act(() => {
      result.current.setParam('factor', 5);
    });
    expect(result.current.node?.params).toEqual({ factor: 5, label: 'x' });

    act(() => {
      core.history.undo();
    });
    expect(result.current.node?.params).toEqual({ factor: 2, label: 'x' });
  });

  it('replaces the whole param bag', () => {
    const { core, nodeId } = coreWithNode();
    const { result } = renderHook(() => useNodeParams(core, nodeId));
    act(() => {
      result.current.setParams({ factor: 9 });
    });
    expect(result.current.node?.params).toEqual({ factor: 9 });
  });

  it('does nothing without a node', () => {
    const { core } = coreWithNode();
    const before = core.history.canUndo();
    const { result } = renderHook(() => useNodeParams(core, undefined));
    expect(result.current.node).toBeUndefined();
    act(() => {
      result.current.setParam('factor', 1);
      result.current.setParams({ factor: 1 });
    });
    expect(core.history.canUndo()).toBe(before);
  });

  it('ignores a param edit for a node that does not exist', () => {
    const { core } = coreWithNode();
    const { result } = renderHook(() => useNodeParams(core, 'gone'));
    expect(result.current.node).toBeUndefined();
    act(() => {
      result.current.setParam('factor', 1);
    });
    expect(result.current.node).toBeUndefined();
  });
});
