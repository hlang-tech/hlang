/**
 * Layered (Sugiyama-style) DAG auto-layout.
 *
 * Turns the O->I topology into tidy left→right coordinates:
 *   1. Break cycles — reverse back-edges found by DFS so layering sees a DAG
 *      (hlang's T<->T feedback is first-class, so this must never loop).
 *   2. Layer assignment — longest-path: a node's layer is 1 + the max layer of
 *      its upstreams; sources land in layer 0.
 *   3. Ordering — reduce crossings with a few median-heuristic sweeps.
 *   4. Coordinates — x = layer * xGap; y from position within the layer,
 *      centered so the diagram is vertically balanced.
 *
 * Pure and deterministic (no Math.random, stable tie-breaking by id). Linear-ish
 * in V+E aside from the bounded ordering sweeps, so it scales to large graphs.
 */

import type { NodeId } from '../model/types';

/** A directed edge for layout (source -> target). */
export interface LayoutEdge {
  readonly from: NodeId;
  readonly to: NodeId;
}

export interface LayoutOptions {
  readonly xGap?: number;
  readonly yGap?: number;
  /** Ordering-improvement sweeps (crossing reduction). Default 4. */
  readonly sweeps?: number;
  /**
   * Flow direction: 'LR' lays layers left→right (default); 'TB' lays them
   * top→bottom. Group-aware layout picks per group so a chain reads wide and a
   * fan reads tall — the diagram stops looking like uniform horizontal bars.
   */
  readonly direction?: 'LR' | 'TB';
}

export interface LayoutPoint {
  readonly x: number;
  readonly y: number;
}

const DEFAULT_X_GAP = 300;
const DEFAULT_Y_GAP = 130;
const DEFAULT_SWEEPS = 4;

export function layoutLayered(
  nodeIds: readonly NodeId[],
  edges: readonly LayoutEdge[],
  options: LayoutOptions = {},
): Map<NodeId, LayoutPoint> {
  const xGap = options.xGap ?? DEFAULT_X_GAP;
  const yGap = options.yGap ?? DEFAULT_Y_GAP;
  const sweeps = options.sweeps ?? DEFAULT_SWEEPS;

  const nodes = [...nodeIds].sort(); // stable base order
  const nodeSet = new Set(nodes);

  // Adjacency (only edges whose endpoints exist).
  const out = new Map<NodeId, NodeId[]>();
  const inc = new Map<NodeId, NodeId[]>();
  for (const id of nodes) {
    out.set(id, []);
    inc.set(id, []);
  }
  const validEdges = edges.filter(e => nodeSet.has(e.from) && nodeSet.has(e.to) && e.from !== e.to);

  // 1. Break cycles: DFS, drop edges that point back to an in-progress node.
  const forwardEdges = breakCycles(nodes, validEdges);
  for (const e of forwardEdges) {
    out.get(e.from)!.push(e.to);
    inc.get(e.to)!.push(e.from);
  }

  // 2. Longest-path layering via Kahn-style topological relaxation.
  const layer = assignLayers(nodes, out, inc);

  // Group nodes by layer.
  const maxLayer = nodes.reduce((m, id) => Math.max(m, layer.get(id) ?? 0), 0);
  const layers: NodeId[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const id of nodes) {
    layers[layer.get(id) ?? 0]!.push(id);
  }
  for (const band of layers) {
    band.sort(); // deterministic initial order
  }

  // 3. Reduce crossings with median-heuristic sweeps (down then up).
  const order = new Map<NodeId, number>();
  const reindex = (): void => {
    for (const band of layers) {
      band.forEach((id, i) => order.set(id, i));
    }
  };
  reindex();
  for (let s = 0; s < sweeps; s += 1) {
    const downward = s % 2 === 0;
    orderingSweep(layers, downward ? inc : out, order, downward);
    reindex();
  }

  // 4. Coordinate assignment. Center each band around a common axis. For 'TB'
  //    the layer axis is vertical and the within-band axis horizontal (swap).
  const tb = (options.direction ?? 'LR') === 'TB';
  const widest = layers.reduce((m, band) => Math.max(m, band.length), 1);
  const pos = new Map<NodeId, LayoutPoint>();
  layers.forEach((band, li) => {
    const crossGap = tb ? xGap : yGap;
    const offset = ((widest - band.length) * crossGap) / 2;
    band.forEach((id, i) => {
      const layerCoord = li * (tb ? yGap : xGap);
      const crossCoord = offset + i * crossGap;
      pos.set(id, tb ? { x: crossCoord, y: layerCoord } : { x: layerCoord, y: crossCoord });
    });
  });
  return pos;
}

/** DFS cycle-break: keep edges that don't close a cycle (drop back-edges). */
function breakCycles(nodes: readonly NodeId[], edges: readonly LayoutEdge[]): LayoutEdge[] {
  const adj = new Map<NodeId, LayoutEdge[]>();
  for (const id of nodes) {
    adj.set(id, []);
  }
  for (const e of edges) {
    adj.get(e.from)!.push(e);
  }
  const state = new Map<NodeId, 0 | 1 | 2>(); // 0 unseen, 1 in-progress, 2 done
  const kept: LayoutEdge[] = [];
  const stack: { id: NodeId; i: number }[] = [];

  for (const start of nodes) {
    if ((state.get(start) ?? 0) !== 0) {
      continue;
    }
    stack.push({ id: start, i: 0 });
    state.set(start, 1);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const edgesOut = adj.get(frame.id)!;
      if (frame.i >= edgesOut.length) {
        state.set(frame.id, 2);
        stack.pop();
        continue;
      }
      const e = edgesOut[frame.i]!;
      frame.i += 1;
      const st = state.get(e.to) ?? 0;
      if (st === 1) {
        // Back-edge → would create a cycle; drop it from the forward set.
        continue;
      }
      kept.push(e);
      if (st === 0) {
        state.set(e.to, 1);
        stack.push({ id: e.to, i: 0 });
      }
    }
  }
  return kept;
}

/** Longest-path layer assignment over a DAG. */
function assignLayers(
  nodes: readonly NodeId[],
  out: ReadonlyMap<NodeId, NodeId[]>,
  inc: ReadonlyMap<NodeId, NodeId[]>,
): Map<NodeId, number> {
  const layer = new Map<NodeId, number>();
  const indeg = new Map<NodeId, number>();
  const queue: NodeId[] = [];
  for (const id of nodes) {
    const d = inc.get(id)!.length;
    indeg.set(id, d);
    layer.set(id, 0);
    if (d === 0) {
      queue.push(id);
    }
  }
  // Kahn's algorithm; relax layer = max(layer, upstream+1).
  let head = 0;
  while (head < queue.length) {
    const id = queue[head]!;
    head += 1;
    const base = layer.get(id)!;
    for (const next of out.get(id)!) {
      layer.set(next, Math.max(layer.get(next)!, base + 1));
      const d = indeg.get(next)! - 1;
      indeg.set(next, d);
      if (d === 0) {
        queue.push(next);
      }
    }
  }
  return layer;
}

/**
 * One crossing-reduction sweep: reorder each band by the median index of each
 * node's neighbors in the adjacent band (`neighbors` = inc for a downward sweep,
 * out for an upward sweep). Nodes with no neighbors keep their current order.
 */
function orderingSweep(
  layers: readonly NodeId[][],
  neighbors: ReadonlyMap<NodeId, NodeId[]>,
  order: ReadonlyMap<NodeId, number>,
  downward: boolean,
): void {
  const start = downward ? 1 : layers.length - 2;
  const end = downward ? layers.length : -1;
  const step = downward ? 1 : -1;
  for (let li = start; li !== end; li += step) {
    const band = layers[li]!;
    const median = new Map<NodeId, number>();
    for (const id of band) {
      const ns = neighbors.get(id)!;
      if (ns.length === 0) {
        median.set(id, order.get(id) ?? 0);
        continue;
      }
      const idxs = ns.map(n => order.get(n) ?? 0).sort((a, b) => a - b);
      const mid = Math.floor(idxs.length / 2);
      const m = idxs.length % 2 === 1 ? idxs[mid]! : (idxs[mid - 1]! + idxs[mid]!) / 2;
      median.set(id, m);
    }
    band.sort((a, b) => {
      const d = (median.get(a) ?? 0) - (median.get(b) ?? 0);
      return d !== 0 ? d : a < b ? -1 : a > b ? 1 : 0; // stable by id
    });
  }
}
