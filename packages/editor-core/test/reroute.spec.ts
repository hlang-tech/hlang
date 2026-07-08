import { createEditorCore, planInsertOnEdge, distanceToSegment } from '../src';
import { AddNodeCommand, ConnectCommand } from '../src';
import { readableDescriptor, transformDescriptor, writableDescriptor } from './fixtures/descriptors';
import type { EditorEdge } from '../src';

describe('distanceToSegment', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };
  it('is zero on the segment', () => {
    expect(distanceToSegment({ x: 50, y: 0 }, a, b)).toBe(0);
  });
  it('is the perpendicular distance beside the segment', () => {
    expect(distanceToSegment({ x: 50, y: 20 }, a, b)).toBeCloseTo(20);
  });
  it('clamps to the nearest endpoint past the ends (not the infinite line)', () => {
    // Beyond b: nearest point is b itself, distance = 30, not the line's 0.
    expect(distanceToSegment({ x: 130, y: 0 }, a, b)).toBeCloseTo(30);
  });
  it('handles a degenerate zero-length segment as distance to the point', () => {
    expect(distanceToSegment({ x: 3, y: 4 }, a, a)).toBeCloseTo(5);
  });
});

/**
 * `planInsertOnEdge` is the pure, smart judgement behind "drop a node onto an
 * edge to insert it". It only succeeds when the dropped node can LEGALLY splice
 * in — its input can accept the edge's upstream O, AND its output can feed the
 * edge's downstream I (both via ConnectionValidator.canLink: direction + type).
 * This naturally excludes R (no input) and W (no output). Returns the two new
 * edges (A→N, N→B) with fresh ids, or null.
 */
function setup() {
  const core = createEditorCore();
  core.registry.register(readableDescriptor);
  core.registry.register(transformDescriptor);
  core.registry.register(writableDescriptor);
  const a = core.registry.createNode('test-source', { x: 0, y: 0 }); // R (out)
  const b = core.registry.createNode('test-sink', { x: 200, y: 0 }); // W (in)
  core.commands.execute(new AddNodeCommand(a));
  core.commands.execute(new AddNodeCommand(b));
  core.commands.execute(
    new ConnectCommand('e-ab', { nodeId: a.id, portId: 'Output' }, { nodeId: b.id, portId: 'Input' }),
  );
  const edge = core.model.getEdge('e-ab') as EditorEdge;
  return { core, edge };
}

describe('planInsertOnEdge', () => {
  it('splices a T node into an edge: returns A→T and T→B', () => {
    const { core, edge } = setup();
    const t = core.registry.createNode('test-transform', { x: 100, y: 0 }); // T (in+out)

    const plan = planInsertOnEdge(t, edge, core.model, core.validator, core.idGenerator);
    expect(plan).not.toBeNull();
    // A→T
    expect(plan?.sourceEdge.source).toEqual(edge.source);
    expect(plan?.sourceEdge.target.nodeId).toBe(t.id);
    // T→B
    expect(plan?.targetEdge.source.nodeId).toBe(t.id);
    expect(plan?.targetEdge.target).toEqual(edge.target);
    // Fresh, distinct edge ids.
    expect(plan?.sourceEdge.id).not.toBe(plan?.targetEdge.id);
    expect(plan?.sourceEdge.id).not.toBe(edge.id);
  });

  it('returns null for an R node (no input to receive upstream)', () => {
    const { core, edge } = setup();
    const r = core.registry.createNode('test-source', { x: 100, y: 0 });
    expect(planInsertOnEdge(r, edge, core.model, core.validator, core.idGenerator)).toBeNull();
  });

  it('returns null for a W node (no output to feed downstream)', () => {
    const { core, edge } = setup();
    const w = core.registry.createNode('test-sink', { x: 100, y: 0 });
    expect(planInsertOnEdge(w, edge, core.model, core.validator, core.idGenerator)).toBeNull();
  });
});
