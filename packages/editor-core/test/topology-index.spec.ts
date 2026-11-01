/**
 * TopologyIndex stays in sync with the live graph through the event bus, and
 * rebuilds from the model on bulk load (restore). Proves the incremental path
 * the UI relies on so it never rescans the graph itself.
 */

import { createEditorCore, AddNodeCommand, ConnectCommand } from '../src';
import { TopologyIndex } from '../src/services/topology-index';
import {
  readableDescriptor,
  transformDescriptor,
  writableDescriptor,
} from './fixtures/descriptors';

function setup() {
  const core = createEditorCore();
  core.registry.register(readableDescriptor);
  core.registry.register(transformDescriptor);
  core.registry.register(writableDescriptor);
  const index = new TopologyIndex(core.model, core.events);
  return { core, index };
}

describe('TopologyIndex', () => {
  it('reflects nodes/edges added through commands (incremental via bus)', () => {
    const { core, index } = setup();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));
    // Two nodes, no edge yet -> two components.
    expect(index.topology.components()).toHaveLength(2);

    const edgeId = core.idGenerator.nextEdgeId();
    core.commands.execute(
      new ConnectCommand(
        edgeId,
        { nodeId: r.id, portId: 'Output' },
        { nodeId: t.id, portId: 'Input' },
      ),
    );
    // Connected -> one component.
    expect(index.topology.components()).toHaveLength(1);
  });

  it('fires onChanged when the graph mutates', () => {
    const { core, index } = setup();
    let changes = 0;
    index.onChanged(() => {
      changes += 1;
    });
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    expect(changes).toBeGreaterThan(0);
  });

  it('rebuilds from the model on reindex after a bulk restore', () => {
    const { core, index } = setup();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
    const w = core.registry.createNode('test-sink', { x: 2, y: 0 });
    // Bulk load bypassing commands/events (as a template import would).
    core.model.restore({
      nodes: [r, t, w],
      edges: [
        { id: 'e1', source: { nodeId: r.id, portId: 'Output' }, target: { nodeId: t.id, portId: 'Input' } },
        { id: 'e2', source: { nodeId: t.id, portId: 'Output' }, target: { nodeId: w.id, portId: 'Input' } },
      ],
    });
    // Before reindex the index is stale; after reindex it sees one component.
    index.reindex();
    expect(index.topology.components()).toHaveLength(1);
    expect(index.topology.components()[0]!.nodeIds.size).toBe(3);
  });

  it('stops updating after dispose', () => {
    const { core, index } = setup();
    index.dispose();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    // Disposed: the pre-dispose empty snapshot remains.
    expect(index.topology.components()).toHaveLength(0);
  });
});
