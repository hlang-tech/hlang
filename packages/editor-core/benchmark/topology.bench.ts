/**
 * Topology performance benchmark. Not a unit test — a standalone harness that
 * prints timings for the 10k-node target so we optimize against numbers, not
 * feelings.
 *
 * Run: npx ts-node benchmark/topology.bench.ts  (or via `npm run bench`)
 *
 * Measures, at 1k / 5k / 10k nodes:
 *   - bulk build (reset) time
 *   - incremental add-edge time (per-edge amortized)
 *   - components() query time (cold, after a removal forces a rebuild)
 *   - componentOf() hot query time
 *   - lint() time
 */

import { GraphTopology } from '../src/services/graph-topology';
import type { EditorEdge, EditorNode, NodeKind, PortDescriptor } from '../src';

const dto = { name: 'DTO', kind: 'interface' as const };
const outP = (id = 'Output'): PortDescriptor => ({ id, direction: 'O', name: id, dataType: dto, isError: false });
const inP = (id = 'Input'): PortDescriptor => ({ id, direction: 'I', name: id, dataType: dto, isError: false });
const errP = (): PortDescriptor => ({ id: '@node/error', direction: 'O', name: 'error', dataType: dto, isError: true });

function makeNode(id: string, kind: NodeKind): EditorNode {
  const ports = kind === 'R' ? [outP(), errP()] : kind === 'T' ? [inP(), outP(), errP()] : [inP()];
  return { id, code: kind.toLowerCase(), kind, name: id, position: { x: 0, y: 0 }, params: {}, ports };
}

/**
 * Generate a realistic workflow-shaped graph: `pipelines` independent chains,
 * each R -> T*(depth) -> W, with occasional fan-out and a few T<->T feedback
 * cycles — the topology that produces genuine subgraph clusters.
 */
function generateGraph(nodeTarget: number): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const nodes: EditorNode[] = [];
  const edges: EditorEdge[] = [];
  const depth = 8;
  const perPipeline = depth + 2; // R + depth*T + W
  const pipelines = Math.max(1, Math.floor(nodeTarget / perPipeline));
  let e = 0;

  for (let p = 0; p < pipelines; p += 1) {
    const rId = `r${p}`;
    nodes.push(makeNode(rId, 'R'));
    let prev = rId;
    const tIds: string[] = [];
    for (let d = 0; d < depth; d += 1) {
      const tId = `t${p}_${d}`;
      nodes.push(makeNode(tId, 'T'));
      tIds.push(tId);
      edges.push({ id: `e${e++}`, source: { nodeId: prev, portId: 'Output' }, target: { nodeId: tId, portId: 'Input' } });
      prev = tId;
    }
    const wId = `w${p}`;
    nodes.push(makeNode(wId, 'W'));
    edges.push({ id: `e${e++}`, source: { nodeId: prev, portId: 'Output' }, target: { nodeId: wId, portId: 'Input' } });

    // Fan-out: every 5th pipeline's R also feeds the 2nd T (extra edge).
    if (p % 5 === 0 && tIds.length > 1) {
      edges.push({ id: `e${e++}`, source: { nodeId: rId, portId: 'Output' }, target: { nodeId: tIds[1]!, portId: 'Input' } });
    }
    // Feedback: every 7th pipeline gets a T<->T back-edge.
    if (p % 7 === 0 && tIds.length > 2) {
      edges.push({ id: `e${e++}`, source: { nodeId: tIds[2]!, portId: 'Output' }, target: { nodeId: tIds[1]!, portId: 'Input' } });
    }
  }
  return { nodes, edges };
}

function time(label: string, fn: () => void): number {
  const start = performance.now();
  fn();
  const ms = performance.now() - start;
  // eslint-disable-next-line no-console
  console.log(`  ${label.padEnd(34)} ${ms.toFixed(2)} ms`);
  return ms;
}

for (const target of [1000, 5000, 10000]) {
  const { nodes, edges } = generateGraph(target);
  // eslint-disable-next-line no-console
  console.log(`\n=== ${nodes.length} nodes / ${edges.length} edges ===`);
  const topo = new GraphTopology();

  time('bulk build (reset)', () => topo.reset(nodes, edges));
  time('components() cold', () => void topo.components());
  time('componentOf() x1000 hot', () => {
    for (let i = 0; i < 1000; i += 1) topo.componentOf(nodes[i % nodes.length]!.id);
  });
  time('lint()', () => void topo.lint());
  // Incremental: add 100 edges one at a time, forcing 100 unions.
  const extra: EditorEdge[] = [];
  for (let i = 0; i < 100 && i + 1 < nodes.length; i += 1) {
    extra.push({ id: `x${i}`, source: { nodeId: nodes[i]!.id, portId: 'Output' }, target: { nodeId: nodes[i + 1]!.id, portId: 'Input' } });
  }
  time('incremental addEdge x100', () => {
    for (const ed of extra) topo.addEdge(ed);
  });
  // Cold rebuild after a removal.
  time('removeEdge + components() rebuild', () => {
    topo.removeEdge('e0');
    void topo.components();
  });
}
