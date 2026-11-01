/**
 * Read-only mode: the editor shows a graph and runs it, but nothing changes
 * it. Enforced where every change passes (the command service and history),
 * so no input path can bypass it.
 */
import { describe, expect, it } from 'vitest';
import { AddNodeCommand, ConnectCommand, MoveNodeCommand, createEditorCore } from '../src';
import type { EditorEvent } from '../src';
import { readableDescriptor, writableDescriptor } from './fixtures/descriptors';

function connected(readOnly?: boolean) {
  const core = createEditorCore(readOnly === undefined ? {} : { readOnly });
  core.registry.register(readableDescriptor);
  core.registry.register(writableDescriptor);
  return core;
}

describe('read-only mode', () => {
  it('is off by default', () => {
    expect(connected().mode.readOnly).toBe(false);
  });

  it('refuses every command, so the graph cannot change', () => {
    const core = connected(true);
    const node = core.registry.createNode('test-source', { x: 0, y: 0 });
    const result = core.commands.execute(new AddNodeCommand(node));
    expect(result.ok).toBe(false);
    expect(result.error?.reason).toBe('read-only');
    expect(core.model.getNodes()).toHaveLength(0);
  });

  it('stops undo and redo, and reports there is nothing to do', () => {
    const core = connected();
    const node = core.registry.createNode('test-source', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(node));
    core.commands.execute(new MoveNodeCommand(node.id, { x: 5, y: 5 }));
    core.history.undo();
    expect(core.history.canRedo()).toBe(true);

    core.mode.setReadOnly(true);
    expect([core.history.canUndo(), core.history.canRedo()]).toEqual([false, false]);
    core.history.undo();
    core.history.redo();
    expect(core.model.getNode(node.id)?.position).toEqual({ x: 0, y: 0 });
  });

  it('still lets the user select, to inspect', () => {
    const core = connected();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const w = core.registry.createNode('test-sink', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(w));
    core.commands.execute(new ConnectCommand('e1', { nodeId: r.id, portId: 'Output' }, { nodeId: w.id, portId: 'Input' }));
    core.mode.setReadOnly(true);
    core.selection.selectNodes([r.id], 'replace');
    core.selection.selectEdges(['e1'], 'add');
    expect([core.selection.isSelected(r.id), core.selection.isSelected('e1')]).toEqual([true, true]);
  });

  it('switches at run time, telling listeners once per change', () => {
    const core = connected();
    const events: EditorEvent[] = [];
    core.events.on('modeChanged', event => events.push(event));
    core.mode.setReadOnly(true);
    core.mode.setReadOnly(true);
    core.mode.setReadOnly(false);
    expect(events).toHaveLength(2);

    const node = core.registry.createNode('test-source', { x: 0, y: 0 });
    expect(core.commands.execute(new AddNodeCommand(node)).ok).toBe(true);
  });
});
