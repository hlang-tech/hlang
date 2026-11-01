/**
 * Layered (Sugiyama-style) DAG layout: assigns coordinates from the O->I
 * topology so a graph reads left→right by flow order, with even spacing and
 * reduced crossings. Pure and deterministic; handles feedback cycles by
 * breaking back-edges before layering.
 */

import { layoutLayered } from '../src/services/layered-layout';
import type { LayoutEdge } from '../src/services/layered-layout';

const edge = (from: string, to: string): LayoutEdge => ({ from, to });

describe('layoutLayered', () => {
  it('places a linear chain in strictly increasing layers (left→right)', () => {
    const nodes = ['a', 'b', 'c'];
    const edges = [edge('a', 'b'), edge('b', 'c')];
    const pos = layoutLayered(nodes, edges);
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x);
    expect(pos.get('b')!.x).toBeLessThan(pos.get('c')!.x);
  });

  it('puts independent sources in the same first layer', () => {
    const nodes = ['r1', 'r2', 'w'];
    const edges = [edge('r1', 'w'), edge('r2', 'w')];
    const pos = layoutLayered(nodes, edges);
    // r1 and r2 are both sources → same x (layer 0); w is downstream.
    expect(pos.get('r1')!.x).toBe(pos.get('r2')!.x);
    expect(pos.get('w')!.x).toBeGreaterThan(pos.get('r1')!.x);
  });

  it('separates two nodes in the same layer vertically (no overlap)', () => {
    const nodes = ['r1', 'r2', 'w'];
    const edges = [edge('r1', 'w'), edge('r2', 'w')];
    const pos = layoutLayered(nodes, edges);
    expect(pos.get('r1')!.y).not.toBe(pos.get('r2')!.y);
  });

  it('assigns a node the layer of its deepest upstream path (longest path)', () => {
    // a->b->c and a->c ; c must sit after b, not tie with b.
    const nodes = ['a', 'b', 'c'];
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('a', 'c')];
    const pos = layoutLayered(nodes, edges);
    expect(pos.get('c')!.x).toBeGreaterThan(pos.get('b')!.x);
  });

  it('terminates and lays out a T<->T feedback cycle (back-edge broken)', () => {
    const nodes = ['t1', 't2'];
    const edges = [edge('t1', 't2'), edge('t2', 't1')];
    const pos = layoutLayered(nodes, edges);
    // Both placed, distinct layers (one back-edge ignored for layering).
    expect(pos.get('t1')).toBeDefined();
    expect(pos.get('t2')).toBeDefined();
    expect(pos.get('t1')!.x).not.toBe(pos.get('t2')!.x);
  });

  it('is deterministic: same input → same output', () => {
    const nodes = ['a', 'b', 'c', 'd'];
    const edges = [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')];
    const p1 = layoutLayered(nodes, edges);
    const p2 = layoutLayered(nodes, edges);
    for (const id of nodes) {
      expect(p1.get(id)).toEqual(p2.get(id));
    }
  });

  it('respects custom gaps', () => {
    const pos = layoutLayered(['a', 'b'], [edge('a', 'b')], { xGap: 500, yGap: 200 });
    expect(pos.get('b')!.x - pos.get('a')!.x).toBe(500);
  });

  it('places a fully disconnected node without throwing', () => {
    const pos = layoutLayered(['lonely'], []);
    expect(pos.get('lonely')).toEqual({ x: 0, y: 0 });
  });

  it("direction 'TB' lays a chain top→bottom (increasing y, shared x)", () => {
    const nodes = ['a', 'b', 'c'];
    const edges = [edge('a', 'b'), edge('b', 'c')];
    const pos = layoutLayered(nodes, edges, { direction: 'TB' });
    expect(pos.get('a')!.y).toBeLessThan(pos.get('b')!.y);
    expect(pos.get('b')!.y).toBeLessThan(pos.get('c')!.y);
    // Same column (x) since each layer has one node.
    expect(pos.get('a')!.x).toBe(pos.get('b')!.x);
  });
});
