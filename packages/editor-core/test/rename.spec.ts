import { describe, it, expect } from 'vitest';
import { createEditorCore } from '../src';
import { AddNodeCommand, RenameNodeCommand } from '../src';
import { readableDescriptor } from './fixtures/descriptors';

/**
 * Renaming a node is an undoable command: it changes the node's top-level
 * `name`, emits `nodeChanged`, and undo restores the prior name.
 */
function setup() {
  const core = createEditorCore();
  core.registry.register(readableDescriptor);
  const node = core.registry.createNode('test-source', { x: 0, y: 0 });
  core.commands.execute(new AddNodeCommand(node));
  return { core, node };
}

describe('RenameNodeCommand', () => {
  it('renames a node and undo restores the prior name', () => {
    const { core, node } = setup();
    const original = node.name;

    const res = core.commands.execute(new RenameNodeCommand(node.id, 'Sunrise'));
    expect(res.ok).toBe(true);
    expect(core.model.getNode(node.id)?.name).toBe('Sunrise');

    core.history.undo();
    expect(core.model.getNode(node.id)?.name).toBe(original);

    core.history.redo();
    expect(core.model.getNode(node.id)?.name).toBe('Sunrise');
  });

  it('emits nodeChanged with the renamed node', () => {
    const { core, node } = setup();
    let seen: string | undefined;
    core.events.on('nodeChanged', e => {
      seen = e.node.name;
    });
    core.commands.execute(new RenameNodeCommand(node.id, 'Aurora'));
    expect(seen).toBe('Aurora');
  });

  it('rejects renaming a missing node', () => {
    const { core } = setup();
    const res = core.commands.execute(new RenameNodeCommand('nope', 'X'));
    expect(res.ok).toBe(false);
    expect(res.error?.reason).toBe('missing-node');
  });
});
