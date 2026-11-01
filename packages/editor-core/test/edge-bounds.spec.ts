/**
 * Bounded connections in the editor (RFC 0001): an edge carries a capacity and
 * an overflow, set by an undoable command, and they travel to and from IGraph.
 */
import { describe, expect, it } from 'vitest';
import {
  AddNodeCommand,
  ConnectCommand,
  SetEdgeBoundsCommand,
  createEditorCore,
  parseGraphSnapshot,
} from '../src';
import type { EditorEvent } from '../src';
import { readableDescriptor, writableDescriptor } from './fixtures/descriptors';

function graph() {
  const core = createEditorCore();
  core.registry.register(readableDescriptor);
  core.registry.register(writableDescriptor);
  const r = core.registry.createNode('test-source', { x: 0, y: 0 });
  const w = core.registry.createNode('test-sink', { x: 1, y: 0 });
  core.commands.execute(new AddNodeCommand(r));
  core.commands.execute(new AddNodeCommand(w));
  core.commands.execute(
    new ConnectCommand('e1', { nodeId: r.id, portId: 'Output' }, { nodeId: w.id, portId: 'Input' }),
  );
  return core;
}

describe('edge bounds', () => {
  it('sets a capacity and an overflow, and undoes and redoes them', () => {
    const core = graph();
    const events: EditorEvent[] = [];
    core.events.on('edgeChanged', event => events.push(event));

    core.commands.execute(new SetEdgeBoundsCommand('e1', { capacity: 4, overflow: 'drop-oldest' }));
    expect(core.model.getEdge('e1')).toMatchObject({ capacity: 4, overflow: 'drop-oldest' });
    expect(events).toHaveLength(1);

    core.history.undo();
    expect(core.model.getEdge('e1')).not.toHaveProperty('capacity');
    expect(core.model.getEdge('e1')).not.toHaveProperty('overflow');

    core.history.redo();
    expect(core.model.getEdge('e1')).toMatchObject({ capacity: 4, overflow: 'drop-oldest' });
  });

  it('clears the bounds, which makes the connection unbounded again', () => {
    const core = graph();
    core.commands.execute(new SetEdgeBoundsCommand('e1', { capacity: 2 }));
    core.commands.execute(new SetEdgeBoundsCommand('e1', {}));
    expect(core.model.getEdge('e1')).not.toHaveProperty('capacity');
  });

  it('refuses bounds the graph would refuse', () => {
    const core = graph();
    const reasons = [{ capacity: 0 }, { capacity: 1.5 }, { overflow: 'drop-oldest' as const }].map(bounds => {
      const result = core.commands.execute(new SetEdgeBoundsCommand('e1', bounds));
      return result.ok ? 'accepted' : result.error?.reason;
    });
    expect(reasons).toEqual(['invalid-capacity', 'invalid-capacity', 'invalid-capacity']);
    // A refused command changes nothing and leaves no history entry.
    expect(core.model.getEdge('e1')).not.toHaveProperty('capacity');
  });

  it('refuses an edge that does not exist', () => {
    const core = graph();
    const result = core.commands.execute(new SetEdgeBoundsCommand('nope', { capacity: 2 }));
    expect(result.ok ? 'accepted' : result.error?.reason).toBe('missing-edge');
  });

  it('carries the bounds to IGraph and back', () => {
    const core = graph();
    core.commands.execute(new SetEdgeBoundsCommand('e1', { capacity: 3, overflow: 'drop-oldest' }));
    const igraph = core.serialization.toIGraph(core.model);
    expect(igraph.connections[0]).toMatchObject({ capacity: 3, overflow: 'drop-oldest' });

    const restored = core.serialization.fromIGraph(igraph);
    expect(restored.edges[0]).toMatchObject({ capacity: 3, overflow: 'drop-oldest' });
  });

  it('leaves an unbounded edge without the fields in IGraph', () => {
    const core = graph();
    const connection = core.serialization.toIGraph(core.model).connections[0];
    expect(connection).not.toHaveProperty('capacity');
    expect(connection).not.toHaveProperty('overflow');
  });

  it('parses bounds in a snapshot, and refuses invalid ones', () => {
    const edge = { id: 'e', source: { nodeId: 'a', portId: 'o' }, target: { nodeId: 'b', portId: 'i' } };
    expect(parseGraphSnapshot({ nodes: [], edges: [{ ...edge, capacity: 2, overflow: 'drop-oldest' }] })?.edges[0]).toMatchObject({
      capacity: 2,
      overflow: 'drop-oldest',
    });
    expect(parseGraphSnapshot({ nodes: [], edges: [{ ...edge, capacity: -1 }] })).toBeNull();
    expect(parseGraphSnapshot({ nodes: [], edges: [{ ...edge, capacity: 2, overflow: 'drop-newest' }] })).toBeNull();
  });
});
