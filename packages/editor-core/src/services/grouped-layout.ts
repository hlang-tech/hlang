/**
 * Group-aware layout: lay each group out INTERNALLY as a compact block (its own
 * layered layout over the subgraph induced by its members), then pack the
 * blocks into non-overlapping regions. This is what makes each group read as a
 * distinct cluster on the canvas instead of its members scattering across the
 * whole graph's shared layers.
 *
 * Packing is a simple deterministic shelf/grid: blocks flow left→right, wrapping
 * to a new row when the row would exceed a target width; each row is as tall as
 * its tallest block. Good enough to keep groups visually separated at any scale;
 * a force-directed group placement is a future refinement.
 *
 * A node in multiple groups is placed by the FIRST group that claims it.
 * Ungrouped nodes are gathered into one implicit trailing block.
 */

import type { NodeId } from '../model/types';
import { layoutLayered } from './layered-layout';
import type { LayoutEdge, LayoutPoint } from './layered-layout';

/** A group for layout purposes: an id and its member set. */
export interface LayoutGroup {
  readonly id: string;
  readonly members: ReadonlySet<NodeId>;
}

export interface GroupedLayoutOptions {
  /** Node box size used for internal layout gaps + block extents. */
  readonly nodeW?: number;
  readonly nodeH?: number;
  /** Gap between packed group blocks. */
  readonly gap?: number;
}

const DEFAULT_NODE_W = 240;
const DEFAULT_NODE_H = 130;
const DEFAULT_GAP = 440;

export function layoutGrouped(
  nodeIds: readonly NodeId[],
  edges: readonly LayoutEdge[],
  groups: readonly LayoutGroup[],
  options: GroupedLayoutOptions = {},
): Map<NodeId, LayoutPoint> {
  const nodeW = options.nodeW ?? DEFAULT_NODE_W;
  const nodeH = options.nodeH ?? DEFAULT_NODE_H;
  const gap = options.gap ?? DEFAULT_GAP;

  const nodeSet = new Set(nodeIds);
  const claimed = new Set<NodeId>();

  // Assign each node to the first group that claims it; leftovers → implicit.
  const blocks: { id: string; members: NodeId[] }[] = [];
  for (const group of groups) {
    const members: NodeId[] = [];
    for (const id of group.members) {
      if (nodeSet.has(id) && !claimed.has(id)) {
        claimed.add(id);
        members.push(id);
      }
    }
    if (members.length > 0) {
      blocks.push({ id: group.id, members });
    }
  }
  const leftovers = nodeIds.filter(id => !claimed.has(id));
  if (leftovers.length > 0) {
    blocks.push({ id: '__ungrouped__', members: [...leftovers] });
  }

  const result = new Map<NodeId, LayoutPoint>();

  const extent = (
    ids: readonly NodeId[],
    p: Map<NodeId, LayoutPoint>,
  ): { minX: number; minY: number; w: number; h: number } => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const id of ids) {
      const q = p.get(id) ?? { x: 0, y: 0 };
      minX = Math.min(minX, q.x);
      minY = Math.min(minY, q.y);
      maxX = Math.max(maxX, q.x + nodeW);
      maxY = Math.max(maxY, q.y + nodeH);
    }
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  };

  // 1. Lay out each block INTERNALLY (aspect-driven direction) and measure it.
  interface Placed { id: string; members: NodeId[]; inner: Map<NodeId, LayoutPoint>; minX: number; minY: number; w: number; h: number }
  const placed: Placed[] = [];
  const blockOfNode = new Map<NodeId, string>();
  for (const block of blocks) {
    for (const id of block.members) {
      blockOfNode.set(id, block.id);
    }
  }
  for (const block of blocks) {
    const memberSet = new Set(block.members);
    const innerEdges = edges.filter(e => memberSet.has(e.from) && memberSet.has(e.to));
    const xGap = nodeW + 80;
    const yGap = nodeH + 20;
    let inner = layoutLayered(block.members, innerEdges, { xGap, yGap, direction: 'LR' });
    const lr = extent(block.members, inner);
    const aspect = lr.h > 0 ? lr.w / lr.h : Number.POSITIVE_INFINITY;
    if (aspect > 2.2 && block.members.length > 3) {
      inner = layoutLayered(block.members, innerEdges, { xGap, yGap, direction: 'TB' });
    }
    const ext = extent(block.members, inner);
    placed.push({ id: block.id, members: block.members, inner, minX: ext.minX, minY: ext.minY, w: ext.w, h: ext.h });
  }

  // 2. Build the GROUP-level DAG from cross-group edges, and assign each block a
  //    column = its longest path in that DAG. This makes group→group edges flow
  //    left→right (outlet on the right of A lines up with inlet on the left of
  //    B), so the underlying node→node edges stay short instead of trailing down.
  const groupOut = new Map<string, Set<string>>();
  const groupIn = new Map<string, Set<string>>();
  for (const b of placed) {
    groupOut.set(b.id, new Set());
    groupIn.set(b.id, new Set());
  }
  for (const e of edges) {
    const gf = blockOfNode.get(e.from);
    const gt = blockOfNode.get(e.to);
    if (gf !== undefined && gt !== undefined && gf !== gt) {
      groupOut.get(gf)?.add(gt);
      groupIn.get(gt)?.add(gf);
    }
  }
  const column = groupColumns(placed.map(b => b.id), groupOut, groupIn);

  // 3. Place blocks by column: x = sum of previous columns' max width + gaps;
  //    within a column, stack blocks vertically. Columns give the horizontal
  //    flow; stacking keeps each column compact.
  const byColumn = new Map<number, Placed[]>();
  for (const b of placed) {
    const c = column.get(b.id) ?? 0;
    const list = byColumn.get(c) ?? [];
    list.push(b);
    byColumn.set(c, list);
  }
  const columns = [...byColumn.keys()].sort((a, b) => a - b);
  let colX = 0;
  for (const c of columns) {
    const list = byColumn.get(c)!;
    const colW = list.reduce((m, b) => Math.max(m, b.w), 0);
    let colY = 0;
    for (const b of list) {
      for (const id of b.members) {
        const p = b.inner.get(id) ?? { x: 0, y: 0 };
        result.set(id, { x: colX + (p.x - b.minX), y: colY + (p.y - b.minY) });
      }
      colY += b.h + gap;
    }
    colX += colW + gap * 1.5;
  }

  return result;
}

/** Longest-path column assignment over the group-level DAG (cycles broken). */
function groupColumns(
  ids: readonly string[],
  out: ReadonlyMap<string, Set<string>>,
  inc: ReadonlyMap<string, Set<string>>,
): Map<string, number> {
  const column = new Map<string, number>();
  const indeg = new Map<string, number>();
  const queue: string[] = [];
  for (const id of [...ids].sort()) {
    const d = inc.get(id)?.size ?? 0;
    indeg.set(id, d);
    column.set(id, 0);
    if (d === 0) {
      queue.push(id);
    }
  }
  let head = 0;
  const seen = new Set<string>(queue);
  while (head < queue.length) {
    const id = queue[head]!;
    head += 1;
    const base = column.get(id)!;
    for (const next of [...(out.get(id) ?? [])].sort()) {
      column.set(next, Math.max(column.get(next)!, base + 1));
      const d = (indeg.get(next) ?? 1) - 1;
      indeg.set(next, d);
      if (d <= 0 && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  // Any node never dequeued (part of a group-level cycle) keeps column 0 → still
  // placed; group cycles are rare and acceptable to lay flat.
  return column;
}
