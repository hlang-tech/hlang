/**
 * @vitest-environment jsdom
 *
 * Behavior test for the node-search trigger hook + controller working together
 * against a REAL editor core. This covers the exact glue that the browser E2E
 * harness cannot drive: React Flow's connection gesture relies on real pointer
 * capture, which synthetic automation events do not honor. Here we invoke the
 * real `onConnectEnd` handler with a genuine "released into empty space"
 * connection state and assert the palette opens, pre-filtered to legal targets,
 * and that committing a choice creates a node AND wires the dangling link.
 *
 * `useReactFlow` is mocked to supply an identity `screenToFlowPosition` — the
 * only React Flow surface these hooks touch — so no ReactFlowProvider/canvas is
 * needed. Everything else (registry, validator, commands, history) is real.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { createEditorCore } from '@hlang-org/editor-core';
import type {
  EditorCore,
  NodeDescriptor,
  PortDescriptor,
} from '@hlang-org/editor-core';
import { useNodeSearch } from './useNodeSearch';
import { useNodeSearchTriggers } from './useNodeSearchTriggers';

// Testing Library unmounts after each test only through an explicit cleanup
// when the test API is imported rather than global.
afterEach(cleanup);

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: (p: { x: number; y: number }) => p,
  }),
}));

const dto = { name: 'DTO', kind: 'interface' as const };
const inPort = (id = 'Input'): PortDescriptor => ({ id, direction: 'I', name: id, dataType: dto, isError: false });
const outPort = (id = 'Output'): PortDescriptor => ({ id, direction: 'O', name: id, dataType: dto, isError: false });
const errPort = (): PortDescriptor => ({ id: '@node/error', direction: 'O', name: 'error', dataType: dto, isError: true });

const R: NodeDescriptor = {
  code: 'text-source', kind: 'R', displayName: 'Text Source', group: 'input',
  ports: [outPort(), errPort()], defaultParams: {}, runtimeResource: '@t/r@1',
};
const T: NodeDescriptor = {
  code: 'uppercase', kind: 'T', displayName: 'Uppercase', group: 'process',
  ports: [inPort(), outPort(), errPort()], defaultParams: {}, runtimeResource: '@t/t@1',
};
const W: NodeDescriptor = {
  code: 'console-sink', kind: 'W', displayName: 'Console', group: 'output',
  ports: [inPort()], defaultParams: {}, runtimeResource: '@t/w@1',
};

function makeCore(): EditorCore {
  const core = createEditorCore();
  core.registry.register(R);
  core.registry.register(T);
  core.registry.register(W);
  return core;
}

/** Add a real Text Source node to the model and return it. */
function addSource(core: EditorCore) {
  const node = core.registry.createNode('text-source', { x: 0, y: 0 });
  core.model.addNode(node);
  return node;
}

/** Render both hooks over one core and return live handles to each. */
function setup(core: EditorCore) {
  return renderHook(() => {
    const search = useNodeSearch(core);
    const triggers = useNodeSearchTriggers(core, search);
    return { search, triggers };
  });
}

/** A FinalConnectionState for a drag released into empty space (no toNode). */
function releasedInEmptySpace(): unknown {
  return { toNode: null, toHandle: null, isValid: null, fromNode: null, fromHandle: null };
}

/** A minimal pointer-like event with client coords. */
function pointerEvent(x: number, y: number): MouseEvent {
  return { clientX: x, clientY: y } as unknown as MouseEvent;
}

describe('useNodeSearchTriggers — connection released into empty space', () => {
  it('opens the palette filtered to nodes that can accept a dangling OUTPUT', () => {
    const core = makeCore();
    const src = addSource(core);
    const { result } = setup(core);

    act(() => {
      // Drag started from the Text Source's Output (a 'source' handle).
      result.current.triggers.onConnectStart(pointerEvent(0, 0), {
        nodeId: src.id,
        handleId: 'Output',
        handleType: 'source',
      });
      // Released over empty canvas.
      result.current.triggers.onConnectEnd(
        pointerEvent(400, 300),
        releasedInEmptySpace() as never,
      );
    });

    const state = result.current.search.state;
    expect(state).toBeDefined();
    expect(state?.pending?.direction).toBe('from-source');
    expect(state?.flow).toEqual({ x: 400, y: 300 });

    // Only nodes with an Input port are offered (Uppercase, Console) — never the
    // source itself (Text Source has no Input).
    const offered = result.current.search.results('').map(v => v.result.value.code).sort();
    expect(offered).toEqual(['console-sink', 'uppercase']);
  });

  it('does NOT open when the drag ends on a node (toNode present)', () => {
    const core = makeCore();
    const src = addSource(core);
    const { result } = setup(core);

    act(() => {
      result.current.triggers.onConnectStart(pointerEvent(0, 0), {
        nodeId: src.id,
        handleId: 'Output',
        handleType: 'source',
      });
      result.current.triggers.onConnectEnd(
        pointerEvent(400, 300),
        { toNode: { id: 'other' }, toHandle: { id: 'Input' } } as never,
      );
    });

    expect(result.current.search.state).toBeUndefined();
  });

  it('commits a choice: creates the node AND wires the dangling link as one undo step', () => {
    const core = makeCore();
    const src = addSource(core);
    const { result } = setup(core);

    act(() => {
      result.current.triggers.onConnectStart(pointerEvent(0, 0), {
        nodeId: src.id,
        handleId: 'Output',
        handleType: 'source',
      });
      result.current.triggers.onConnectEnd(pointerEvent(400, 300), releasedInEmptySpace() as never);
    });

    const view = result.current.search.results('upper')[0];
    expect(view).toBeDefined();
    expect(view?.connectPortId).toBe('Input');

    act(() => {
      if (view) result.current.search.commit(view);
    });

    // Palette closed; the source node plus one new node exist.
    expect(result.current.search.state).toBeUndefined();
    const nodes = core.model.getNodes();
    expect(nodes).toHaveLength(2);
    const created = nodes.find(n => n.code === 'uppercase');
    expect(created).toBeDefined();

    // An edge from the dangling source (src/Output) to the new node's Input was
    // created. (The validator allowed it: O->I, compatible DTO.)
    const edges = core.model.getEdges();
    expect(edges).toHaveLength(1);
    expect(edges[0]?.source).toEqual({ nodeId: src.id, portId: 'Output' });
    expect(edges[0]?.target.portId).toBe('Input');
    expect(edges[0]?.target.nodeId).toBe(created?.id);

    // The create+connect is ONE undo entry (transact): undo removes both the
    // new node and the edge, leaving just the original source.
    act(() => {
      core.history.undo();
    });
    expect(core.model.getNodes()).toHaveLength(1);
    expect(core.model.getEdges()).toHaveLength(0);
  });
});

describe('useNodeSearchTriggers — double-click on empty pane', () => {
  it('opens a blank palette on the second rapid pane click', () => {
    const core = makeCore();
    let t = 1000;
    const { result } = renderHook(() => {
      const search = useNodeSearch(core);
      const triggers = useNodeSearchTriggers(core, search, { now: () => t, doubleClickMs: 300 });
      return { search, triggers };
    });

    act(() => {
      result.current.triggers.onPaneClick({ clientX: 120, clientY: 90 } as never);
    });
    expect(result.current.search.state).toBeUndefined(); // first click: nothing

    t = 1200; // within 300ms window
    act(() => {
      result.current.triggers.onPaneClick({ clientX: 120, clientY: 90 } as never);
    });
    const state = result.current.search.state;
    expect(state).toBeDefined();
    expect(state?.pending).toBeUndefined(); // blank mode
    expect(state?.flow).toEqual({ x: 120, y: 90 });
  });

  it('does not open on two SLOW clicks (outside the window)', () => {
    const core = makeCore();
    let t = 1000;
    const { result } = renderHook(() => {
      const search = useNodeSearch(core);
      const triggers = useNodeSearchTriggers(core, search, { now: () => t, doubleClickMs: 300 });
      return { search, triggers };
    });

    act(() => {
      result.current.triggers.onPaneClick({ clientX: 10, clientY: 10 } as never);
    });
    t = 2000; // 1s later — too slow
    act(() => {
      result.current.triggers.onPaneClick({ clientX: 10, clientY: 10 } as never);
    });
    expect(result.current.search.state).toBeUndefined();
  });
});
