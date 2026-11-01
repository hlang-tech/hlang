/**
 * React bindings behavior: graph sync, connect (validated), history, selection.
 * Uses @testing-library/react's renderHook against a real EditorCore.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import type { Connection } from '@xyflow/react';
import { AddNodeCommand } from '@hlang-org/editor-core';
import { useGraphSync } from '../src/hooks/useGraphSync';
import { useConnect, useIsValidConnection } from '../src/hooks/useConnect';
import { useHistory } from '../src/hooks/useHistory';
import { useSelection } from '../src/hooks/useSelection';
import { useViewState } from '../src/hooks/useViewState';
import { useClipboard } from '../src/hooks/useClipboard';
import { useRename } from '../src/hooks/useRename';
import { useDiagnostics } from '../src/hooks/useDiagnostics';
import { useReconnect } from '../src/hooks/useReconnect';
import { ConnectCommand } from '@hlang-org/editor-core';
import { makeCore } from './fixtures/core';

// Testing Library unmounts after each test only through an explicit cleanup
// when the test API is imported rather than global.
afterEach(cleanup);

describe('useGraphSync', () => {
  it('reflects nodes/edges and re-renders when the model changes', () => {
    const core = makeCore();
    const { result } = renderHook(() => useGraphSync(core));
    expect(result.current.nodes).toHaveLength(0);

    const r = core.registry.createNode('r', { x: 0, y: 0 });
    act(() => {
      core.commands.execute(new AddNodeCommand(r));
    });
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0]?.type).toBe('R');
    expect(result.current.nodes[0]?.data.editorNode.id).toBe(r.id);
  });
});

describe('useConnect + useIsValidConnection', () => {
  it('commits a valid O->I connection and derives an edge', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    const t = core.registry.createNode('t', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));

    const { result } = renderHook(() => ({
      connect: useConnect(core),
      valid: useIsValidConnection(core),
      view: useGraphSync(core),
    }));

    const connection: Connection = {
      source: r.id,
      sourceHandle: 'Output',
      target: t.id,
      targetHandle: 'Input',
    };
    expect(result.current.valid(connection)).toBe(true);

    act(() => {
      result.current.connect(connection);
    });
    expect(result.current.view.edges).toHaveLength(1);
    expect(result.current.view.edges[0]?.source).toBe(r.id);
    expect(result.current.view.edges[0]?.target).toBe(t.id);
  });

  it('rejects a reversed connection (target is an O port)', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    const t = core.registry.createNode('t', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));

    const { result } = renderHook(() => useIsValidConnection(core));
    // Reversed: source handle is an Input, target handle is an Output.
    const reversed: Connection = {
      source: t.id,
      sourceHandle: 'Input',
      target: r.id,
      targetHandle: 'Output',
    };
    expect(result.current(reversed)).toBe(false);
  });
});

describe('useHistory', () => {
  it('tracks canUndo/canRedo and performs undo/redo', () => {
    const core = makeCore();
    const { result } = renderHook(() => ({
      history: useHistory(core),
      view: useGraphSync(core),
    }));
    expect(result.current.history.canUndo).toBe(false);

    const r = core.registry.createNode('r', { x: 0, y: 0 });
    act(() => {
      core.commands.execute(new AddNodeCommand(r));
    });
    expect(result.current.history.canUndo).toBe(true);
    expect(result.current.view.nodes).toHaveLength(1);

    act(() => {
      result.current.history.undo();
    });
    expect(result.current.view.nodes).toHaveLength(0);
    expect(result.current.history.canRedo).toBe(true);

    act(() => {
      result.current.history.redo();
    });
    expect(result.current.view.nodes).toHaveLength(1);
  });
});

describe('useSelection', () => {
  it('reflects selection changes', () => {
    const core = makeCore();
    const { result } = renderHook(() => useSelection(core));
    expect(result.current.selectedNodes).toHaveLength(0);

    act(() => {
      result.current.selectNodes(['a', 'b'], 'replace');
    });
    expect([...result.current.selectedNodes].sort()).toEqual(['a', 'b']);
    expect(result.current.isSelected('a')).toBe(true);

    act(() => {
      result.current.clear();
    });
    expect(result.current.selectedNodes).toHaveLength(0);
  });
});

describe('useViewState', () => {
  it('reflects hidden/locked toggles', () => {
    const core = makeCore();
    const { result } = renderHook(() => useViewState(core));
    expect(result.current.isHidden('a')).toBe(false);
    expect(result.current.isLocked('a')).toBe(false);

    act(() => {
      result.current.toggleHidden('a');
      result.current.setLocked('a', true);
    });
    expect(result.current.isHidden('a')).toBe(true);
    expect(result.current.isLocked('a')).toBe(true);
    expect([...result.current.hiddenNodes]).toEqual(['a']);

    act(() => {
      result.current.clear();
    });
    expect(result.current.hiddenNodes).toHaveLength(0);
    expect(result.current.lockedNodes).toHaveLength(0);
  });

  it('toggling hidden/locked is undoable via history', () => {
    const core = makeCore();
    const { result } = renderHook(() => useViewState(core));

    act(() => {
      result.current.toggleHidden('a');
    });
    expect(result.current.isHidden('a')).toBe(true);

    act(() => {
      core.history.undo();
    });
    expect(result.current.isHidden('a')).toBe(false);

    act(() => {
      core.history.redo();
    });
    expect(result.current.isHidden('a')).toBe(true);
  });
});

describe('useClipboard', () => {
  it('duplicates the selection with fresh ids as ONE undo step', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.selection.selectNodes([r.id], 'replace');

    const { result } = renderHook(() => useClipboard(core));
    act(() => {
      result.current.duplicate();
    });

    expect(core.model.getNodes()).toHaveLength(2);
    const clone = core.model.getNodes().find(n => n.id !== r.id);
    expect(clone?.id).not.toBe(r.id);
    expect(clone?.position).toEqual({ x: 28, y: 28 });
    // The clone is now selected.
    expect(core.selection.isSelected(clone?.id ?? '')).toBe(true);

    // A single undo removes the whole duplicate.
    act(() => {
      core.history.undo();
    });
    expect(core.model.getNodes()).toHaveLength(1);
  });

  it('copy → paste remaps an internal edge and undoes as one step', async () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    const t = core.registry.createNode('t', { x: 100, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));
    core.commands.execute(
      new ConnectCommand('e1', { nodeId: r.id, portId: 'Output' }, { nodeId: t.id, portId: 'Input' }),
    );
    core.selection.selectNodes([r.id, t.id], 'replace');

    const { result } = renderHook(() => useClipboard(core));
    await act(async () => {
      result.current.copy();
      result.current.paste();
      // paste reads the (async) system clipboard before falling back to the ref.
      await Promise.resolve();
      await Promise.resolve();
    });

    // Two originals + two clones; two edges (original + remapped clone edge).
    expect(core.model.getNodes()).toHaveLength(4);
    expect(core.model.getEdges()).toHaveLength(2);
    const cloneEdge = core.model.getEdges().find(e => e.id !== 'e1');
    expect(cloneEdge?.source.nodeId).not.toBe(r.id);
    expect(cloneEdge?.target.nodeId).not.toBe(t.id);

    act(() => {
      core.history.undo();
    });
    expect(core.model.getNodes()).toHaveLength(2);
    expect(core.model.getEdges()).toHaveLength(1);
  });

  it('cut removes the selection (one undo restores it)', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.selection.selectNodes([r.id], 'replace');

    const { result } = renderHook(() => useClipboard(core));
    act(() => {
      result.current.cut();
    });
    expect(core.model.getNodes()).toHaveLength(0);
    expect(result.current.canPaste()).toBe(true);

    act(() => {
      core.history.undo();
    });
    expect(core.model.getNodes()).toHaveLength(1);
  });
});

describe('view-state → React Flow mapping', () => {
  it('reflects hidden and locked flags onto the derived RF node', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));

    const { result } = renderHook(() => ({
      view: useGraphSync(core),
      vs: useViewState(core),
    }));

    // Default: visible + draggable.
    expect(result.current.view.nodes[0]?.hidden).toBe(false);
    expect(result.current.view.nodes[0]?.draggable).toBe(true);

    act(() => {
      result.current.vs.setHidden(r.id, true);
      result.current.vs.setLocked(r.id, true);
    });

    // The GraphView must re-derive with the flags reflected.
    expect(result.current.view.nodes[0]?.hidden).toBe(true);
    expect(result.current.view.nodes[0]?.draggable).toBe(false);
    expect(result.current.view.nodes[0]?.selectable).toBe(false);
  });

  it('reflects core selection onto the derived RF node (⌘A path)', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const { result } = renderHook(() => useGraphSync(core));
    expect(result.current.nodes[0]?.selected).toBe(false);
    act(() => {
      core.selection.selectNodes([r.id], 'replace');
    });
    expect(result.current.nodes[0]?.selected).toBe(true);
  });
});

describe('useRename', () => {
  it('renames a node through an undoable command', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const { result } = renderHook(() => useRename(core));
    act(() => {
      result.current.rename(r.id, 'Renamed');
    });
    expect(core.model.getNode(r.id)?.name).toBe('Renamed');
    act(() => {
      core.history.undo();
    });
    expect(core.model.getNode(r.id)?.name).not.toBe('Renamed');
  });

  it('ignores empty / unchanged names', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    const original = core.model.getNode(r.id)?.name;
    const { result } = renderHook(() => useRename(core));
    act(() => {
      result.current.rename(r.id, '   '); // whitespace-only → no-op
      result.current.rename(r.id, original ?? ''); // unchanged → no-op
    });
    expect(core.model.getNode(r.id)?.name).toBe(original);
  });
});

describe('useDiagnostics', () => {
  it('surfaces a predictive warning for an unconnected sink and clears on fix', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    const w = core.registry.createNode('w', { x: 1, y: 0 });
    const { result } = renderHook(() => useDiagnostics(core));

    act(() => {
      core.commands.execute(new AddNodeCommand(r));
      core.commands.execute(new AddNodeCommand(w));
    });
    expect(result.current.worstOf(w.id)?.severity).toBe('warning');

    act(() => {
      core.commands.execute(
        new ConnectCommand('e1', { nodeId: r.id, portId: 'Output' }, { nodeId: w.id, portId: 'Input' }),
      );
    });
    expect(result.current.worstOf(w.id)).toBeUndefined();
  });
});

describe('useReconnect', () => {
  it('inserts a T node onto an edge (A→T→B) as one undo step, snapping to a point', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    const w = core.registry.createNode('w', { x: 200, y: 0 });
    const t = core.registry.createNode('t', { x: 999, y: 999 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(w));
    core.commands.execute(new AddNodeCommand(t));
    core.commands.execute(
      new ConnectCommand('e-rw', { nodeId: r.id, portId: 'Output' }, { nodeId: w.id, portId: 'Input' }),
    );

    const { result } = renderHook(() => useReconnect(core));
    let ok = false;
    act(() => {
      ok = result.current.insertOnEdge(t.id, 'e-rw', { x: 100, y: 0 });
    });
    expect(ok).toBe(true);
    // Original edge gone; two new edges R→T and T→W.
    expect(core.model.getEdge('e-rw')).toBeUndefined();
    expect(core.model.getEdges()).toHaveLength(2);
    expect(core.model.getNode(t.id)?.position).toEqual({ x: 100, y: 0 });

    act(() => {
      core.history.undo();
    });
    expect(core.model.getEdge('e-rw')).toBeDefined();
    expect(core.model.getEdges()).toHaveLength(1);
  });

  it('refuses to insert an R node onto an edge (no legal splice)', () => {
    const core = makeCore();
    const r = core.registry.createNode('r', { x: 0, y: 0 });
    const w = core.registry.createNode('w', { x: 200, y: 0 });
    const r2 = core.registry.createNode('r', { x: 100, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(w));
    core.commands.execute(new AddNodeCommand(r2));
    core.commands.execute(
      new ConnectCommand('e-rw', { nodeId: r.id, portId: 'Output' }, { nodeId: w.id, portId: 'Input' }),
    );
    const { result } = renderHook(() => useReconnect(core));
    let ok = true;
    act(() => {
      ok = result.current.insertOnEdge(r2.id, 'e-rw');
    });
    expect(ok).toBe(false);
    expect(core.model.getEdge('e-rw')).toBeDefined();
  });
});
