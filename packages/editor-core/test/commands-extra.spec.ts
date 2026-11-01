/**
 * Coverage for the remaining commands and their error/undo paths.
 */

import {
  createEditorCore,
  AddNodeCommand,
  ConnectCommand,
  DisconnectCommand,
  UpdateParamsCommand,
  MoveNodeCommand,
  RemoveNodeCommand,
} from '../src';
import type { Endpoint } from '../src';
import { readableDescriptor, transformDescriptor } from './fixtures/descriptors';

function setup() {
  const core = createEditorCore();
  core.registry.register(readableDescriptor);
  core.registry.register(transformDescriptor);
  const r = core.registry.createNode('test-source', { x: 0, y: 0 });
  const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
  core.commands.execute(new AddNodeCommand(r));
  core.commands.execute(new AddNodeCommand(t));
  return { core, r, t };
}
const out = (nodeId: string): Endpoint => ({ nodeId, portId: 'Output' });
const inp = (nodeId: string): Endpoint => ({ nodeId, portId: 'Input' });

describe('DisconnectCommand', () => {
  it('removes an edge and undo restores it', () => {
    const { core, r, t } = setup();
    core.commands.execute(new ConnectCommand('e1', out(r.id), inp(t.id)));
    core.commands.execute(new DisconnectCommand('e1'));
    expect(core.model.getEdges()).toHaveLength(0);
    core.history.undo();
    expect(core.model.getEdges()).toHaveLength(1);
  });

  it('fails cleanly on a missing edge', () => {
    const { core } = setup();
    const result = core.commands.execute(new DisconnectCommand('ghost'));
    expect(result.ok).toBe(false);
    expect(result.error?.reason).toBe('missing-edge');
  });
});

describe('UpdateParamsCommand', () => {
  it('updates params and undo restores the previous bag', () => {
    const { core, r } = setup();
    core.commands.execute(new UpdateParamsCommand(r.id, { value: 1 }));
    expect(core.model.getNode(r.id)?.params).toEqual({ value: 1 });
    core.commands.execute(new UpdateParamsCommand(r.id, { value: 2 }));
    expect(core.model.getNode(r.id)?.params).toEqual({ value: 2 });
    core.history.undo();
    expect(core.model.getNode(r.id)?.params).toEqual({ value: 1 });
  });

  it('fails cleanly on a missing node', () => {
    const { core } = setup();
    const result = core.commands.execute(new UpdateParamsCommand('ghost', {}));
    expect(result.ok).toBe(false);
    expect(result.error?.reason).toBe('missing-node');
  });
});

describe('MoveNodeCommand / RemoveNodeCommand error paths', () => {
  it('MoveNode fails cleanly on a missing node', () => {
    const { core } = setup();
    const result = core.commands.execute(new MoveNodeCommand('ghost', { x: 1, y: 1 }));
    expect(result.ok).toBe(false);
    expect(result.error?.reason).toBe('missing-node');
  });

  it('RemoveNode fails cleanly on a missing node', () => {
    const { core } = setup();
    const result = core.commands.execute(new RemoveNodeCommand('ghost'));
    expect(result.ok).toBe(false);
    expect(result.error?.reason).toBe('missing-node');
  });

  it('emitted nodeChanged carries the updated node', () => {
    const { core, r } = setup();
    let lastX: number | undefined;
    core.events.on('nodeChanged', e => (lastX = e.node.position.x));
    core.commands.execute(new MoveNodeCommand(r.id, { x: 99, y: 0 }));
    expect(lastX).toBe(99);
  });
});
