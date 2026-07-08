/**
 * Graph topology analysis: weakly-connected components (the "living subgraphs"
 * that groups render from) and edit-time lint diagnostics, computed from the
 * O->I connection topology alone — no separate stored group model.
 *
 * These lock the BEHAVIOR and the INCREMENTAL contract that the 10k-node target
 * depends on: adjacency is a resident index, component membership is union-find
 * backed, and edge add/remove update incrementally rather than by full rescan.
 */

import { GraphTopology, classifyInterface } from '../src/services/graph-topology';
import type { EditorEdge, EditorNode, PortDescriptor } from '../src';

const dto = { name: 'DTO', kind: 'interface' as const };
const outPort = (id = 'Output'): PortDescriptor => ({ id, direction: 'O', name: id, dataType: dto, isError: false });
const inPort = (id = 'Input'): PortDescriptor => ({ id, direction: 'I', name: id, dataType: dto, isError: false });
const errPort = (): PortDescriptor => ({ id: '@node/error', direction: 'O', name: 'error', dataType: dto, isError: true });

function node(id: string, kind: 'R' | 'T' | 'W'): EditorNode {
  const ports =
    kind === 'R' ? [outPort(), errPort()]
    : kind === 'T' ? [inPort(), outPort(), errPort()]
    : [inPort()];
  return { id, code: kind.toLowerCase(), kind, name: id, position: { x: 0, y: 0 }, params: {}, ports };
}

function edge(id: string, from: string, to: string, fromPort = 'Output', toPort = 'Input'): EditorEdge {
  return { id, source: { nodeId: from, portId: fromPort }, target: { nodeId: to, portId: toPort } };
}

describe('GraphTopology — weakly-connected components', () => {
  it('groups a linear R->T->W chain into one component', () => {
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    topo.addNode(node('t', 'T'));
    topo.addNode(node('w', 'W'));
    topo.addEdge(edge('e1', 'r', 't'));
    topo.addEdge(edge('e2', 't', 'w'));

    const comps = topo.components();
    expect(comps).toHaveLength(1);
    expect([...comps[0]!.nodeIds].sort()).toEqual(['r', 't', 'w']);
  });

  it('keeps two disjoint pipelines as two components', () => {
    const topo = new GraphTopology();
    for (const id of ['r1', 't1', 'w1', 'r2', 'w2']) {
      topo.addNode(node(id, id.startsWith('r') ? 'R' : id.startsWith('w') ? 'W' : 'T'));
    }
    topo.addEdge(edge('e1', 'r1', 't1'));
    topo.addEdge(edge('e2', 't1', 'w1'));
    topo.addEdge(edge('e3', 'r2', 'w2'));

    const comps = topo.components();
    expect(comps).toHaveLength(2);
    const sizes = comps.map(c => c.nodeIds.size).sort();
    expect(sizes).toEqual([2, 3]);
  });

  it('reports the component id a node belongs to, stable across queries', () => {
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    topo.addNode(node('t', 'T'));
    topo.addEdge(edge('e1', 'r', 't'));
    const cr = topo.componentOf('r');
    const ct = topo.componentOf('t');
    expect(cr).toBeDefined();
    expect(cr).toBe(ct); // same weakly-connected component
  });

  it('merges two components when an edge bridges them (incremental union)', () => {
    const topo = new GraphTopology();
    topo.addNode(node('a', 'R'));
    topo.addNode(node('b', 'T'));
    topo.addNode(node('c', 'W'));
    topo.addEdge(edge('e1', 'a', 'b'));
    expect(topo.components()).toHaveLength(2); // {a,b} and {c}
    topo.addEdge(edge('e2', 'b', 'c'));
    expect(topo.components()).toHaveLength(1); // merged
  });

  it('splits a component when the bridging edge is removed', () => {
    const topo = new GraphTopology();
    topo.addNode(node('a', 'R'));
    topo.addNode(node('b', 'T'));
    topo.addNode(node('c', 'W'));
    topo.addEdge(edge('e1', 'a', 'b'));
    topo.addEdge(edge('e2', 'b', 'c'));
    expect(topo.components()).toHaveLength(1);
    topo.removeEdge('e2');
    // {a,b} stays connected; {c} splits off.
    const comps = topo.components();
    expect(comps).toHaveLength(2);
    const sizes = comps.map(c => c.nodeIds.size).sort();
    expect(sizes).toEqual([1, 2]);
  });

  it('keeps a T<->T feedback cycle within a single component', () => {
    const topo = new GraphTopology();
    topo.addNode(node('t1', 'T'));
    topo.addNode(node('t2', 'T'));
    topo.addEdge(edge('e1', 't1', 't2'));
    topo.addEdge(edge('e2', 't2', 't1'));
    expect(topo.components()).toHaveLength(1);
    expect(topo.components()[0]!.nodeIds.size).toBe(2);
  });

  it('drops a node and its incident edges from the topology', () => {
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    topo.addNode(node('t', 'T'));
    topo.addEdge(edge('e1', 'r', 't'));
    topo.removeNode('t');
    const comps = topo.components();
    expect(comps).toHaveLength(1);
    expect([...comps[0]!.nodeIds]).toEqual(['r']);
  });
});

describe('GraphTopology — subgraph interface extraction (subgraph<->node isomorphism)', () => {
  it('extracts the boundary I/O of a mid-pipeline T subgraph (collapse-to-T)', () => {
    // r -> t1 -> t2 -> t3 -> w ; select {t1,t2} as a composite.
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    topo.addNode(node('t1', 'T'));
    topo.addNode(node('t2', 'T'));
    topo.addNode(node('t3', 'T'));
    topo.addNode(node('w', 'W'));
    topo.addEdge(edge('e0', 'r', 't1'));
    topo.addEdge(edge('e1', 't1', 't2'));
    topo.addEdge(edge('e2', 't2', 't3'));
    topo.addEdge(edge('e3', 't3', 'w'));

    const iface = topo.extractInterface(new Set(['t1', 't2']));
    // Input boundary: r->t1 enters at t1.Input.
    expect(iface.inputs).toEqual([{ nodeId: 't1', portId: 'Input' }]);
    // Output boundary: t2->t3 leaves at t2.Output.
    expect(iface.outputs).toEqual([{ nodeId: 't2', portId: 'Output' }]);
  });

  it('reports no boundary when the selection is a whole isolated component', () => {
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    topo.addNode(node('t', 'T'));
    topo.addNode(node('w', 'W'));
    topo.addEdge(edge('e0', 'r', 't'));
    topo.addEdge(edge('e1', 't', 'w'));
    const iface = topo.extractInterface(new Set(['r', 't', 'w']));
    expect(iface.inputs).toEqual([]);
    expect(iface.outputs).toEqual([]);
  });

  it('includes OPEN ports (declared but unconnected) in the interface', () => {
    // A lone T with no edges: its Input is an open interface input, its Output
    // an open interface output. This is the bug that made groups show 0 ports.
    const topo = new GraphTopology();
    topo.addNode(node('t', 'T'));
    const iface = topo.extractInterface(new Set(['t']));
    expect(iface.inputs).toEqual([{ nodeId: 't', portId: 'Input' }]);
    expect(iface.outputs).toEqual([{ nodeId: 't', portId: 'Output' }]);
  });

  it('a merge with one input fed internally still exposes the OTHER open input', () => {
    // src -> mrg.A (internal); mrg.B open. Group {src, mrg} exposes B as input,
    // mrg.Output as output. (Multi-input composite with a genuinely open inlet.)
    const topo = new GraphTopology();
    topo.addNode(node('src', 'R'));
    const mrg: EditorNode = {
      id: 'mrg', code: 'merge', kind: 'T', name: 'mrg', position: { x: 0, y: 0 }, params: {},
      ports: [inPort('A'), inPort('B'), outPort(), errPort()],
    };
    topo.addNode(mrg);
    topo.addEdge(edge('e', 'src', 'mrg', 'Output', 'A'));
    const iface = topo.extractInterface(new Set(['src', 'mrg']));
    expect(iface.inputs).toEqual([{ nodeId: 'mrg', portId: 'B' }]);
    expect(iface.outputs).toEqual([{ nodeId: 'mrg', portId: 'Output' }]);
  });

  it('excludes @node/error ports from the interface unless wired across', () => {
    const topo = new GraphTopology();
    topo.addNode(node('t', 'T'));
    const iface = topo.extractInterface(new Set(['t']));
    // Only Output (not @node/error) is an interface output.
    expect(iface.outputs).toEqual([{ nodeId: 't', portId: 'Output' }]);
  });

  it('a W group exposes its open input and no outputs (composite sink)', () => {
    const topo = new GraphTopology();
    topo.addNode(node('w', 'W'));
    const iface = topo.extractInterface(new Set(['w']));
    expect(iface.inputs).toEqual([{ nodeId: 'w', portId: 'Input' }]);
    expect(iface.outputs).toEqual([]);
  });

  it('reports a single Output for a fan-out (one O port feeding many members)', () => {
    // t0 -> a, t0 -> b (both outside). t0's single Output is ONE interface
    // output (not duplicated per edge). Its Input is open → also an interface
    // input, since an unconnected declared input is part of the interface.
    const topo = new GraphTopology();
    topo.addNode(node('t0', 'T'));
    topo.addNode(node('a', 'T'));
    topo.addNode(node('b', 'T'));
    topo.addEdge(edge('e0', 't0', 'a'));
    topo.addEdge(edge('e1', 't0', 'b'));
    const iface = topo.extractInterface(new Set(['t0']));
    expect(iface.outputs).toEqual([{ nodeId: 't0', portId: 'Output' }]);
    expect(iface.inputs).toEqual([{ nodeId: 't0', portId: 'Input' }]);
  });

  it('captures distinct named input ports on a multi-input member (merge)', () => {
    // A merge T declares two named inputs A, B (+ Output + error). Selecting it
    // alone exposes BOTH inputs (open) and its Output — the multi-in composite.
    const topo = new GraphTopology();
    const merge: EditorNode = {
      id: 'merge', code: 'merge', kind: 'T', name: 'merge', position: { x: 0, y: 0 }, params: {},
      ports: [inPort('A'), inPort('B'), outPort(), errPort()],
    };
    topo.addNode(merge);
    const iface = topo.extractInterface(new Set(['merge']));
    expect(iface.inputs).toEqual([
      { nodeId: 'merge', portId: 'A' },
      { nodeId: 'merge', portId: 'B' },
    ]);
    expect(iface.outputs).toEqual([{ nodeId: 'merge', portId: 'Output' }]);
  });
});

describe('classifyInterface — subgraph as R/T/W composite', () => {
  it('classifies out-only as R, in-only as W, both as T, empty as T', () => {
    const ep = (nodeId: string, portId: string) => ({ nodeId, portId });
    expect(classifyInterface({ inputs: [], outputs: [ep('a', 'Output')] })).toBe('R');
    expect(classifyInterface({ inputs: [ep('a', 'Input')], outputs: [] })).toBe('W');
    expect(classifyInterface({ inputs: [ep('a', 'Input')], outputs: [ep('b', 'Output')] })).toBe('T');
    expect(classifyInterface({ inputs: [], outputs: [] })).toBe('T');
  });
});

describe('GraphTopology — edit-time lint', () => {
  it('flags a T node whose Input has no upstream (dangling input)', () => {
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    topo.addNode(node('t', 'T'));
    topo.addNode(node('w', 'W'));
    topo.addEdge(edge('e1', 't', 'w')); // t->w, but nothing feeds t
    const diagnostics = topo.lint();
    const dangling = diagnostics.filter(d => d.code === 'dangling-input');
    expect(dangling.map(d => d.nodeId)).toContain('t');
  });

  it('flags a W node with no upstream (unreachable sink)', () => {
    const topo = new GraphTopology();
    topo.addNode(node('w', 'W'));
    const diagnostics = topo.lint();
    expect(diagnostics.some(d => d.code === 'sink-no-upstream' && d.nodeId === 'w')).toBe(true);
  });

  it('flags an R node whose output feeds nothing (dead source)', () => {
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    const diagnostics = topo.lint();
    expect(diagnostics.some(d => d.code === 'dead-source' && d.nodeId === 'r')).toBe(true);
  });

  it('a fully-wired R->T->W chain has no diagnostics', () => {
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    topo.addNode(node('t', 'T'));
    topo.addNode(node('w', 'W'));
    topo.addEdge(edge('e1', 'r', 't'));
    topo.addEdge(edge('e2', 't', 'w'));
    expect(topo.lint()).toEqual([]);
  });

  it('ignores the @node/error port when judging dead sources', () => {
    // An R wired to a W via its normal Output is NOT a dead source, even though
    // its @node/error port is unconnected.
    const topo = new GraphTopology();
    topo.addNode(node('r', 'R'));
    topo.addNode(node('w', 'W'));
    topo.addEdge(edge('e1', 'r', 'w'));
    expect(topo.lint().some(d => d.code === 'dead-source')).toBe(false);
  });
});
