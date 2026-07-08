/**
 * Commands, history (undo/redo), and cascade delete.
 */

import {
  createEditorCore,
  AddNodeCommand,
  ConnectCommand,
  RemoveNodeCommand,
  MoveNodeCommand,
} from '../src';
import type { Endpoint } from '../src';
import {
  readableDescriptor,
  transformDescriptor,
} from './fixtures/descriptors';

function setup() {
  const core = createEditorCore();
  core.registry.register(readableDescriptor);
  core.registry.register(transformDescriptor);
  return core;
}
const out = (nodeId: string): Endpoint => ({ nodeId, portId: 'Output' });
const inp = (nodeId: string): Endpoint => ({ nodeId, portId: 'Input' });

describe('commands + history', () => {
  it('case 6: connect then undo (edges 1->0) then redo (0->1)', () => {
    const core = setup();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));

    const connect = core.commands.execute(
      new ConnectCommand('e1', out(r.id), inp(t.id)),
    );
    expect(connect.ok).toBe(true);
    expect(core.model.getEdges()).toHaveLength(1);

    core.history.undo();
    expect(core.model.getEdges()).toHaveLength(0);

    core.history.redo();
    expect(core.model.getEdges()).toHaveLength(1);
  });

  it('case 7: cascade delete removes incident edges; undo restores node AND edges', () => {
    const core = setup();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));
    core.commands.execute(new ConnectCommand('e1', out(r.id), inp(t.id)));
    expect(core.model.getEdges()).toHaveLength(1);

    core.commands.execute(new RemoveNodeCommand(t.id));
    expect(core.model.getNode(t.id)).toBeUndefined();
    expect(core.model.getEdges()).toHaveLength(0);

    core.history.undo();
    expect(core.model.getNode(t.id)).toBeDefined();
    expect(core.model.getEdges()).toHaveLength(1);
  });

  it('rejects an illegal connection without recording history', () => {
    const core = setup();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));

    // Reversed direction: target is an O port -> invalid.
    const result = core.commands.execute(
      new ConnectCommand('bad', inp(t.id), out(r.id)),
    );
    expect(result.ok).toBe(false);
    expect(result.error?.reason).toBe('bad-direction');
    expect(core.model.getEdges()).toHaveLength(0);
    // History should still be able to undo the two AddNode commands only.
    expect(core.history.canUndo()).toBe(true);
  });

  it('transact coalesces multiple moves into a single undo entry', () => {
    const core = setup();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));

    core.history.transact('Drag', () => {
      core.commands.execute(new MoveNodeCommand(r.id, { x: 5, y: 5 }));
      core.commands.execute(new MoveNodeCommand(r.id, { x: 10, y: 10 }));
    });
    expect(core.model.getNode(r.id)?.position).toEqual({ x: 10, y: 10 });

    // One undo reverts the entire drag back to the original position.
    core.history.undo();
    expect(core.model.getNode(r.id)?.position).toEqual({ x: 0, y: 0 });
  });
});
