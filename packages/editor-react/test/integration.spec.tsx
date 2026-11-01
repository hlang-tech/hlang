/**
 * Context, change-translation, and the aggregate useHlangFlow hook.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, render, cleanup } from '@testing-library/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { AddNodeCommand } from '@hlang-org/editor-core';
import { EditorProvider, useEditor } from '../src/context';
import { useNodeChanges, useEdgeChanges } from '../src/hooks/useChanges';
import { useHlangFlow } from '../src/hooks/useHlangFlow';
import type { HlangRFNode, HlangRFEdge } from '../src/mapping/types';
import { makeCore } from './fixtures/core';

// Testing Library unmounts after each test only through an explicit cleanup
// when the test API is imported rather than global.
afterEach(cleanup);

describe('EditorProvider / useEditor', () => {
  it('provides the core to descendants', () => {
    const core = makeCore();
    const { result } = renderHook(() => useEditor(), {
      wrapper: ({ children }) => <EditorProvider core={core}>{children}</EditorProvider>,
    });
    expect(result.current).toBe(core);
  });

  it('throws when used outside a provider', () => {
    // Silence the expected React error log for this negative case.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useEditor())).toThrow(/EditorProvider/);
    spy.mockRestore();
  });

  it('renders children', () => {
    const core = makeCore();
    const { getByText } = render(
      <EditorProvider core={core}>
        <span>child</span>
      </EditorProvider>,
    );
    expect(getByText('child')).toBeDefined();
  });
});

describe('useNodeChanges', () => {
  it('commits a position drag on release as a MoveNodeCommand', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const { result } = renderHook(() => useNodeChanges(core));

    const changes: NodeChange<HlangRFNode>[] = [
      { type: 'position', id: r.id, position: { x: 50, y: 60 }, dragging: false },
    ];
    act(() => {
      result.current(changes);
    });
    expect(core.model.getNode(r.id)?.position).toEqual({ x: 50, y: 60 });
  });

  it('ignores intermediate drag frames (dragging === true)', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const { result } = renderHook(() => useNodeChanges(core));

    act(() => {
      result.current([{ type: 'position', id: r.id, position: { x: 5, y: 5 }, dragging: true }]);
    });
    expect(core.model.getNode(r.id)?.position).toEqual({ x: 0, y: 0 });
  });

  it('removes a node on a remove change', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const { result } = renderHook(() => useNodeChanges(core));

    act(() => {
      result.current([{ type: 'remove', id: r.id }]);
    });
    expect(core.model.getNode(r.id)).toBeUndefined();
  });

  it('forwards select changes to the selection service', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const { result } = renderHook(() => useNodeChanges(core));

    act(() => {
      result.current([{ type: 'select', id: r.id, selected: true }]);
    });
    expect(core.selection.isSelected(r.id)).toBe(true);
    act(() => {
      result.current([{ type: 'select', id: r.id, selected: false }]);
    });
    expect(core.selection.isSelected(r.id)).toBe(false);
  });
});

describe('useEdgeChanges', () => {
  it('disconnects an edge on remove and selects on select', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    const t = core.registry.createNode('t', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));
    core.model.addEdge({
      id: 'e1',
      source: { nodeId: r.id, portId: 'Output' },
      target: { nodeId: t.id, portId: 'Input' },
    });
    const { result } = renderHook(() => useEdgeChanges(core));

    const selectChanges: EdgeChange<HlangRFEdge>[] = [{ type: 'select', id: 'e1', selected: true }];
    act(() => {
      result.current(selectChanges);
    });
    expect(core.selection.isSelected('e1')).toBe(true);

    act(() => {
      result.current([{ type: 'remove', id: 'e1' }]);
    });
    expect(core.model.getEdge('e1')).toBeUndefined();
  });
});

describe('useHlangFlow', () => {
  it('reconciles nodes/edges added to the core after mount', () => {
    const core = makeCore();
    const { result } = renderHook(() => useHlangFlow(core));
    expect(result.current.nodes).toHaveLength(0);

    const r = core.registry.createNode('r', { x: 0, y: 0 });
    const t = core.registry.createNode('t', { x: 1, y: 0 });
    act(() => {
      core.commands.execute(new AddNodeCommand(r));
      core.commands.execute(new AddNodeCommand(t));
    });
    expect(result.current.nodes).toHaveLength(2);

    const connection: Connection = {
      source: r.id, sourceHandle: 'Output', target: t.id, targetHandle: 'Input',
    };
    expect(result.current.isValidConnection(connection)).toBe(true);
    act(() => {
      result.current.onConnect(connection);
    });
    expect(result.current.edges).toHaveLength(1);
  });

  it('does NOT commit intermediate drag frames, only the finished drag', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const { result } = renderHook(() => useHlangFlow(core));

    // Count history mutations to prove intermediate frames record nothing.
    let historyChanges = 0;
    core.events.on('historyChanged', () => (historyChanges += 1));

    // Intermediate frames (dragging === true) must not touch the core model.
    act(() => {
      result.current.onNodesChange([
        { type: 'position', id: r.id, position: { x: 5, y: 5 }, dragging: true },
      ]);
    });
    act(() => {
      result.current.onNodesChange([
        { type: 'position', id: r.id, position: { x: 9, y: 9 }, dragging: true },
      ]);
    });
    expect(core.model.getNode(r.id)?.position).toEqual({ x: 0, y: 0 });
    expect(historyChanges).toBe(0); // no MoveNodeCommand recorded during the drag

    // The committed frame (dragging === false) records exactly one command.
    act(() => {
      result.current.onNodesChange([
        { type: 'position', id: r.id, position: { x: 12, y: 12 }, dragging: false },
      ]);
    });
    expect(core.model.getNode(r.id)?.position).toEqual({ x: 12, y: 12 });
    expect(historyChanges).toBe(1); // exactly one MoveNodeCommand on drag end

    // The live view reflects the final position too.
    expect(result.current.nodes[0]?.position).toEqual({ x: 12, y: 12 });
  });

  it('reflects undo/redo of a move on the canvas (position is remembered)', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const { result } = renderHook(() => useHlangFlow(core));

    // Finish a drag to (30, 30).
    act(() => {
      result.current.onNodesChange([
        { type: 'position', id: r.id, position: { x: 30, y: 30 }, dragging: false },
      ]);
    });
    expect(result.current.nodes[0]?.position).toEqual({ x: 30, y: 30 });

    // Undo -> back to origin, and the canvas must reflect it.
    act(() => {
      core.history.undo();
    });
    expect(result.current.nodes[0]?.position).toEqual({ x: 0, y: 0 });

    // Redo -> back to (30, 30), and the canvas must reflect THAT too.
    act(() => {
      core.history.redo();
    });
    expect(result.current.nodes[0]?.position).toEqual({ x: 30, y: 30 });
  });

  it('preserves the live drag position when the core emits a structural change', () => {
    const core = makeCore();
    const a = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(a));
    const { result } = renderHook(() => useHlangFlow(core));

    // Simulate a live drag (local only), then add another node to the core.
    act(() => {
      result.current.onNodesChange([
        { type: 'position', id: a.id, position: { x: 40, y: 40 }, dragging: true },
      ]);
    });
    const b = core.registry.createNode('t', { x: 1, y: 0 });
    act(() => {
      core.commands.execute(new AddNodeCommand(b));
    });

    // Reconcile must keep node `a` at its live-dragged position, not reset it.
    const nodeA = result.current.nodes.find(n => n.id === a.id);
    expect(nodeA?.position).toEqual({ x: 40, y: 40 });
    expect(result.current.nodes).toHaveLength(2);
  });
});
