import { describe, it, expect } from 'vitest';
import { cloneNodesWithEdges } from '../src';
import { CountingIdGenerator } from '../src';
import type { EditorEdge, EditorNode, ParamBag } from '../src';

/**
 * `cloneNodesWithEdges` is a pure helper used by the binding layer for
 * duplicate/paste. It clones a set of nodes (fresh ids, offset positions,
 * preserved config) and re-wires ONLY the edges internal to the set, remapping
 * both endpoints through the old→new id map. It has no side effects.
 */

function node(id: string, x = 0, y = 0, params: ParamBag = {}): EditorNode {
  return { id, code: 'test-transform', kind: 'T', name: id, position: { x, y }, params, ports: [] };
}
function edge(id: string, from: string, to: string): EditorEdge {
  return { id, source: { nodeId: from, portId: 'Output' }, target: { nodeId: to, portId: 'Input' } };
}

describe('cloneNodesWithEdges', () => {
  it('assigns fresh ids and offsets positions, preserving config', () => {
    const ids = new CountingIdGenerator();
    const src = node('a', 10, 20, { factor: 3 });
    const { nodes, idMap } = cloneNodesWithEdges([src], [], ids, { dx: 24, dy: 24 });

    expect(nodes).toHaveLength(1);
    const clone = nodes[0];
    expect(clone?.id).toBe('node-1');
    expect(clone?.id).not.toBe('a');
    expect(clone?.position).toEqual({ x: 34, y: 44 });
    expect(clone?.name).toBe('a');
    expect(clone?.params).toEqual({ factor: 3 });
    expect(clone?.code).toBe('test-transform');
    expect(idMap.get('a')).toBe('node-1');
  });

  it('remaps edges whose BOTH endpoints are in the set', () => {
    const ids = new CountingIdGenerator();
    const { nodes, edges, idMap } = cloneNodesWithEdges(
      [node('a'), node('b')],
      [edge('e1', 'a', 'b')],
      ids,
      { dx: 0, dy: 0 },
    );

    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    const e = edges[0];
    expect(e?.id).toBe('edge-1');
    expect(e?.source.nodeId).toBe(idMap.get('a'));
    expect(e?.target.nodeId).toBe(idMap.get('b'));
    // Ports preserved.
    expect(e?.source.portId).toBe('Output');
    expect(e?.target.portId).toBe('Input');
  });

  it('drops edges that cross the boundary (one endpoint outside the set)', () => {
    const ids = new CountingIdGenerator();
    const { edges } = cloneNodesWithEdges(
      [node('a')],
      [edge('e1', 'a', 'outsider'), edge('e2', 'outsider', 'a')],
      ids,
      { dx: 0, dy: 0 },
    );
    expect(edges).toHaveLength(0);
  });

  it('is pure — does not mutate the source nodes', () => {
    const ids = new CountingIdGenerator();
    const src = node('a', 5, 5, { k: 1 });
    const frozen = JSON.stringify(src);
    cloneNodesWithEdges([src], [], ids, { dx: 10, dy: 10 });
    expect(JSON.stringify(src)).toBe(frozen);
  });
});
