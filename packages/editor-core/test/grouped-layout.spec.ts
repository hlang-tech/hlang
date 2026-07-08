/**
 * Group-aware layout: each group is laid out INTERNALLY as a compact block
 * (its own layered layout), and the blocks are packed into non-overlapping
 * regions on the canvas. This is what makes each group read as a distinct
 * cluster instead of its members scattering across shared layers.
 *
 * Ungrouped nodes are collected into one implicit trailing block.
 */

import { layoutGrouped } from '../src/services/grouped-layout';
import type { LayoutEdge } from '../src/services/layered-layout';

const edge = (from: string, to: string): LayoutEdge => ({ from, to });

describe('layoutGrouped', () => {
  it('lays out every node exactly once', () => {
    const nodes = ['a1', 'a2', 'b1', 'b2'];
    const edges = [edge('a1', 'a2'), edge('b1', 'b2')];
    const groups = [
      { id: 'A', members: new Set(['a1', 'a2']) },
      { id: 'B', members: new Set(['b1', 'b2']) },
    ];
    const pos = layoutGrouped(nodes, edges, groups);
    expect(new Set(pos.keys())).toEqual(new Set(nodes));
  });

  it('keeps two groups in disjoint (non-overlapping) bounding boxes', () => {
    const nodes = ['a1', 'a2', 'b1', 'b2'];
    const edges = [edge('a1', 'a2'), edge('b1', 'b2')];
    const groups = [
      { id: 'A', members: new Set(['a1', 'a2']) },
      { id: 'B', members: new Set(['b1', 'b2']) },
    ];
    const pos = layoutGrouped(nodes, edges, groups, { nodeW: 200, nodeH: 100, gap: 400 });

    const bbox = (ids: string[]) => {
      const xs = ids.map(i => pos.get(i)!.x);
      const ys = ids.map(i => pos.get(i)!.y);
      return { minX: Math.min(...xs), maxX: Math.max(...xs) + 200, minY: Math.min(...ys), maxY: Math.max(...ys) + 100 };
    };
    const A = bbox(['a1', 'a2']);
    const B = bbox(['b1', 'b2']);
    const overlap = A.minX < B.maxX && B.minX < A.maxX && A.minY < B.maxY && B.minY < A.maxY;
    expect(overlap).toBe(false);
  });

  it('lays each group out internally left→right by its own flow', () => {
    const nodes = ['a1', 'a2', 'a3'];
    const edges = [edge('a1', 'a2'), edge('a2', 'a3')];
    const groups = [{ id: 'A', members: new Set(['a1', 'a2', 'a3']) }];
    const pos = layoutGrouped(nodes, edges, groups);
    expect(pos.get('a1')!.x).toBeLessThan(pos.get('a2')!.x);
    expect(pos.get('a2')!.x).toBeLessThan(pos.get('a3')!.x);
  });

  it('collects ungrouped nodes into their own block, also placed', () => {
    const nodes = ['a1', 'a2', 'loose1', 'loose2'];
    const edges = [edge('a1', 'a2'), edge('loose1', 'loose2')];
    const groups = [{ id: 'A', members: new Set(['a1', 'a2']) }];
    const pos = layoutGrouped(nodes, edges, groups);
    expect(pos.get('loose1')).toBeDefined();
    expect(pos.get('loose2')).toBeDefined();
  });

  it('is deterministic', () => {
    const nodes = ['a1', 'a2', 'b1'];
    const edges = [edge('a1', 'a2')];
    const groups = [
      { id: 'A', members: new Set(['a1', 'a2']) },
      { id: 'B', members: new Set(['b1']) },
    ];
    const p1 = layoutGrouped(nodes, edges, groups);
    const p2 = layoutGrouped(nodes, edges, groups);
    for (const id of nodes) {
      expect(p1.get(id)).toEqual(p2.get(id));
    }
  });

  it('places a downstream group to the RIGHT of the group feeding it', () => {
    // Group A (a1) feeds group B (b1) via a cross-group edge → B is a later
    // column, so every B node sits right of every A node.
    const nodes = ['a1', 'b1'];
    const edges = [edge('a1', 'b1')];
    const groups = [
      { id: 'A', members: new Set(['a1']) },
      { id: 'B', members: new Set(['b1']) },
    ];
    const pos = layoutGrouped(nodes, edges, groups);
    expect(pos.get('a1')!.x).toBeLessThan(pos.get('b1')!.x);
  });

  it('places a node that belongs to multiple groups once (first group wins)', () => {
    const nodes = ['shared', 'a', 'b'];
    const edges: LayoutEdge[] = [];
    const groups = [
      { id: 'A', members: new Set(['shared', 'a']) },
      { id: 'B', members: new Set(['shared', 'b']) },
    ];
    const pos = layoutGrouped(nodes, edges, groups);
    expect(pos.get('shared')).toBeDefined();
    expect(pos.size).toBe(3);
  });
});
