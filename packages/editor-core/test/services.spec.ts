/**
 * Focused coverage for the smaller services: event bus, selection, registry,
 * graph model edge cases, id generator, and history edge cases.
 */

import {
  createEditorCore,
  EventBus,
  GraphModel,
  CountingIdGenerator,
  AddNodeCommand,
} from '../src';
import type { EditorNode } from '../src';
import { readableDescriptor, writableDescriptor } from './fixtures/descriptors';

function node(id: string): EditorNode {
  return {
    id,
    code: 'test-source',
    kind: 'R',
    name: 'Source',
    position: { x: 0, y: 0 },
    params: {},
    ports: [],
  };
}

describe('EventBus', () => {
  it('delivers events to subscribers and stops after dispose', () => {
    const bus = new EventBus();
    const seen: string[] = [];
    const sub = bus.on('nodeAdded', e => seen.push(e.node.id));
    bus.emit({ kind: 'nodeAdded', node: node('a') });
    sub.dispose();
    bus.emit({ kind: 'nodeAdded', node: node('b') });
    expect(seen).toEqual(['a']);
  });

  it('ignores events with no subscribers', () => {
    const bus = new EventBus();
    expect(() => bus.emit({ kind: 'historyChanged' })).not.toThrow();
  });
});

describe('SelectionService', () => {
  it('supports replace, add, and toggle across nodes and edges', () => {
    const core = createEditorCore();
    core.selection.selectNodes(['a', 'b'], 'replace');
    expect([...core.selection.getSelectedNodes()].sort()).toEqual(['a', 'b']);
    core.selection.selectNodes(['c'], 'add');
    expect(core.selection.isSelected('c')).toBe(true);
    core.selection.selectNodes(['a'], 'toggle');
    expect(core.selection.isSelected('a')).toBe(false);
    core.selection.selectEdges(['e1'], 'replace');
    expect(core.selection.isSelected('e1')).toBe(true);
    core.selection.clear();
    expect(core.selection.getSelectedNodes().size).toBe(0);
    expect(core.selection.getSelectedEdges().size).toBe(0);
  });

  it('emits selectionChanged on mutation', () => {
    const core = createEditorCore();
    let count = 0;
    core.events.on('selectionChanged', () => (count += 1));
    core.selection.selectNodes(['a'], 'replace');
    core.selection.clear();
    expect(count).toBe(2);
  });
});

describe('NodeRegistry', () => {
  it('lists descriptors and filters by group', () => {
    const core = createEditorCore();
    core.registry.register(readableDescriptor);
    core.registry.register(writableDescriptor);
    expect(core.registry.list()).toHaveLength(2);
    expect(core.registry.list({ group: 'output' })).toEqual([writableDescriptor]);
    expect(core.registry.get('test-source')).toBe(readableDescriptor);
  });

  it('throws when creating a node from an unknown code', () => {
    const core = createEditorCore();
    expect(() => core.registry.createNode('nope', { x: 0, y: 0 })).toThrow(/nope/);
  });
});

describe('GraphModel edge cases', () => {
  it('rejects duplicate nodes and edges, and missing endpoints', () => {
    const model = new GraphModel();
    model.addNode(node('a'));
    expect(() => model.addNode(node('a'))).toThrow(/already exists/);
    expect(() => model.removeNode('ghost')).toThrow(/does not exist/);
    expect(() =>
      model.addEdge({ id: 'e1', source: { nodeId: 'a', portId: 'Output' }, target: { nodeId: 'x', portId: 'Input' } }),
    ).toThrow(/target node/);
    expect(() => model.removeEdge('none')).toThrow(/does not exist/);
    expect(() => model.updateNodeParams('ghost', {})).toThrow(/does not exist/);
    expect(() => model.updateNodePosition('ghost', { x: 0, y: 0 })).toThrow(/does not exist/);
  });

  it('snapshot and restore reproduce the graph', () => {
    const model = new GraphModel();
    model.addNode(node('a'));
    model.addNode(node('b'));
    const snap = model.snapshot();
    model.removeNode('a');
    expect(model.getNodes()).toHaveLength(1);
    model.restore(snap);
    expect(model.getNodes()).toHaveLength(2);
  });
});

describe('CountingIdGenerator', () => {
  it('produces monotonically increasing prefixed ids', () => {
    const gen = new CountingIdGenerator('n', 'e');
    expect(gen.nextNodeId()).toBe('n-1');
    expect(gen.nextNodeId()).toBe('n-2');
    expect(gen.nextEdgeId()).toBe('e-1');
  });
});

describe('HistoryService edge cases', () => {
  it('undo/redo on empty stacks are safe no-ops', () => {
    const core = createEditorCore();
    expect(core.history.canUndo()).toBe(false);
    expect(core.history.canRedo()).toBe(false);
    expect(() => core.history.undo()).not.toThrow();
    expect(() => core.history.redo()).not.toThrow();
  });

  it('a new command clears the redo stack', () => {
    const core = createEditorCore();
    core.registry.register(readableDescriptor);
    const a = core.registry.createNode('test-source', { x: 0, y: 0 });
    const b = core.registry.createNode('test-source', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(a));
    core.history.undo();
    expect(core.history.canRedo()).toBe(true);
    core.commands.execute(new AddNodeCommand(b));
    expect(core.history.canRedo()).toBe(false);
  });

  it('clear empties both stacks', () => {
    const core = createEditorCore();
    core.registry.register(readableDescriptor);
    const a = core.registry.createNode('test-source', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(a));
    core.history.clear();
    expect(core.history.canUndo()).toBe(false);
  });

  it('an empty transaction records nothing', () => {
    const core = createEditorCore();
    core.history.transact('noop', () => undefined);
    expect(core.history.canUndo()).toBe(false);
  });
});
