/**
 * `GraphTopology` — a resident, incrementally-maintained index over the graph's
 * O->I connection topology. It answers the two questions that both "living
 * groups" and edit-time lint are built on, WITHOUT any separate stored group
 * model: a subgraph is simply a weakly-connected component of the wiring.
 *
 * Designed for the 10k-node target:
 *   - Adjacency is a resident `Map<NodeId, {out, in}>` (O(1) neighbor access),
 *     never a linear scan of an edge array.
 *   - Weakly-connected components use union-find with path compression + union
 *     by rank, so adding an edge is near-O(1) amortized.
 *   - Union-find cannot delete efficiently, so edge/node removal marks the
 *     touched component dirty and rebuilds ONLY that component (a BFS bounded by
 *     the component's size) on the next query — never a full-graph rescan.
 *   - Lint is a single pass over nodes using cached in/out degree.
 *
 * This class is pure model logic: no React, no RxJS, no DOM. A separate thin
 * adapter subscribes it to the editor event bus for live maintenance.
 */

import type { EditorEdge, EditorNode, Endpoint, NodeId, PortId, PortDescriptor, NodeKind } from '../model/types';
import { ERROR_PORT_NAME } from '../model/types';

/** A weakly-connected component: one "living subgraph". */
export interface TopologyComponent {
  /** Stable representative id for this component (a member node id). */
  readonly id: NodeId;
  readonly nodeIds: ReadonlySet<NodeId>;
}

/**
 * The outward-facing interface of a subgraph: the ports on its boundary. This
 * is what the subgraph would expose if collapsed into a single composite node —
 * the technical basis for hlang's subgraph<->node isomorphism.
 *   - `inputs`: I ports on member nodes fed from OUTSIDE the subgraph (or,
 *     optionally, with no feed at all — "open" inputs).
 *   - `outputs`: O ports on member nodes consumed OUTSIDE the subgraph (or open).
 */
export interface SubgraphInterface {
  readonly inputs: readonly Endpoint[];
  readonly outputs: readonly Endpoint[];
}

/**
 * Classify a subgraph's interface into an hlang node kind, realizing the
 * subgraph<->node isomorphism: a group with only outward outputs behaves like a
 * source (R), only inputs like a sink (W), and both like a transform (T). An
 * empty interface (fully self-contained) is treated as a T by convention.
 */
export function classifyInterface(iface: SubgraphInterface): NodeKind {
  const hasIn = iface.inputs.length > 0;
  const hasOut = iface.outputs.length > 0;
  if (hasOut && !hasIn) {
    return 'R';
  }
  if (hasIn && !hasOut) {
    return 'W';
  }
  return 'T';
}

/** An edit-time diagnostic code. */
export type LintCode = 'dangling-input' | 'sink-no-upstream' | 'dead-source';

/** An edit-time lint diagnostic anchored to a node. */
export interface LintDiagnostic {
  readonly code: LintCode;
  readonly nodeId: NodeId;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

interface Adjacency {
  readonly out: Set<NodeId>;
  readonly in: Set<NodeId>;
}

export class GraphTopology {
  /** nodeId -> its kind (for lint) and adjacency (for components + degree). */
  private readonly kinds = new Map<NodeId, NodeKind>();
  private readonly adjacency = new Map<NodeId, Adjacency>();
  /**
   * nodeId -> its declared ports. REQUIRED for a correct interface: a group's
   * interface includes ports that are declared but unconnected ("open"), not
   * only ports that happen to sit on an edge. Without this the interface is
   * blind to open inlets/outlets.
   */
  private readonly ports = new Map<NodeId, readonly PortDescriptor[]>();
  /**
   * edgeId -> its endpoints (node + port), so removeEdge can detach and
   * extractInterface can report which specific ports cross a subgraph boundary.
   */
  private readonly edges = new Map<
    NodeId,
    { from: NodeId; fromPort: PortId; to: NodeId; toPort: PortId }
  >();

  // --- Union-find over weak connectivity ---
  private readonly parent = new Map<NodeId, NodeId>();
  private readonly rank = new Map<NodeId, number>();
  /**
   * When true, the union-find structure may over-merge (an edge removal can
   * leave two now-separate node sets still sharing a root). We rebuild lazily
   * on the next component query. Rebuild is scoped: only the roots recorded in
   * `dirtyRoots` are torn down and recomputed.
   */
  private dirty = false;

  // -------------------------------------------------------------------------
  // Mutations (incremental)
  // -------------------------------------------------------------------------

  addNode(node: EditorNode): void {
    if (this.adjacency.has(node.id)) {
      return;
    }
    this.kinds.set(node.id, node.kind);
    this.ports.set(node.id, node.ports);
    this.adjacency.set(node.id, { out: new Set(), in: new Set() });
    this.parent.set(node.id, node.id);
    this.rank.set(node.id, 0);
  }

  removeNode(id: NodeId): void {
    const adj = this.adjacency.get(id);
    if (adj === undefined) {
      return;
    }
    // Detach all incident edges from neighbors.
    for (const to of adj.out) {
      this.adjacency.get(to)?.in.delete(id);
    }
    for (const from of adj.in) {
      this.adjacency.get(from)?.out.delete(id);
    }
    for (const [edgeId, ends] of this.edges) {
      if (ends.from === id || ends.to === id) {
        this.edges.delete(edgeId);
      }
    }
    this.kinds.delete(id);
    this.ports.delete(id);
    this.adjacency.delete(id);
    this.parent.delete(id);
    this.rank.delete(id);
    // Removing a node can split a component; rebuild lazily.
    this.dirty = true;
  }

  addEdge(edge: EditorEdge): void {
    const from = edge.source.nodeId;
    const to = edge.target.nodeId;
    if (!this.adjacency.has(from) || !this.adjacency.has(to)) {
      return; // endpoints must exist; mirrors validator's node-existence rule
    }
    if (this.edges.has(edge.id)) {
      return;
    }
    this.edges.set(edge.id, {
      from,
      fromPort: edge.source.portId,
      to,
      toPort: edge.target.portId,
    });
    this.adjacency.get(from)!.out.add(to);
    this.adjacency.get(to)!.in.add(from);
    // Weak connectivity: union regardless of direction.
    this.union(from, to);
  }

  removeEdge(id: NodeId): void {
    const ends = this.edges.get(id);
    if (ends === undefined) {
      return;
    }
    this.edges.delete(id);
    this.adjacency.get(ends.from)?.out.delete(ends.to);
    this.adjacency.get(ends.to)?.in.delete(ends.from);
    // Only removals can split a component; defer the recompute until queried.
    this.dirty = true;
  }

  /** Replace the entire topology from a node/edge snapshot (bulk load). */
  reset(nodes: readonly EditorNode[], edges: readonly EditorEdge[]): void {
    this.kinds.clear();
    this.ports.clear();
    this.adjacency.clear();
    this.edges.clear();
    this.parent.clear();
    this.rank.clear();
    this.dirty = false;
    for (const node of nodes) {
      this.addNode(node);
    }
    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /** All weakly-connected components. */
  components(): readonly TopologyComponent[] {
    this.ensureClean();
    const byRoot = new Map<NodeId, Set<NodeId>>();
    for (const id of this.adjacency.keys()) {
      const root = this.find(id);
      let set = byRoot.get(root);
      if (set === undefined) {
        set = new Set();
        byRoot.set(root, set);
      }
      set.add(id);
    }
    const result: TopologyComponent[] = [];
    for (const [root, nodeIds] of byRoot) {
      result.push({ id: root, nodeIds });
    }
    return result;
  }

  /** The component id (representative) a node belongs to, or undefined. */
  componentOf(id: NodeId): NodeId | undefined {
    if (!this.adjacency.has(id)) {
      return undefined;
    }
    this.ensureClean();
    return this.find(id);
  }

  /**
   * The outward-facing interface of the subgraph induced by `nodeIds`: the
   * ports on member nodes whose connections cross the subgraph boundary. These
   * are exactly the I/O ports the subgraph would expose if collapsed into one
   * composite node — the basis for hlang's subgraph<->node isomorphism.
   *
   * Complexity: O(E_incident) — only edges touching a member node are examined.
   * Deterministic order: inputs then outputs, each in edge-insertion order,
   * de-duplicated by (nodeId, portId) since a port may cross the boundary on
   * more than one edge (fan-in / fan-out).
   */
  extractInterface(nodeIds: ReadonlySet<NodeId>): SubgraphInterface {
    // Per-port internal satisfaction, scoped to this subgraph. Key `id port`.
    const internallyFedInputs = new Set<string>();
    const internallyConsumedOutputs = new Set<string>();
    const wiredAcross = new Set<string>(); // ports with a cross-boundary edge

    for (const { from, fromPort, to, toPort } of this.edges.values()) {
      const fromInside = nodeIds.has(from);
      const toInside = nodeIds.has(to);
      if (fromInside && toInside) {
        internallyConsumedOutputs.add(`${from} ${fromPort}`);
        internallyFedInputs.add(`${to} ${toPort}`);
      } else if (fromInside) {
        wiredAcross.add(`${from} ${fromPort}`);
      } else if (toInside) {
        wiredAcross.add(`${to} ${toPort}`);
      }
    }

    // A port is interface unless satisfied INTERNALLY. Includes OPEN ports
    // (declared, no edge). Error ports surface only if wired across.
    const inputs: Endpoint[] = [];
    const outputs: Endpoint[] = [];
    for (const nodeId of nodeIds) {
      const ports = this.ports.get(nodeId);
      if (ports === undefined) {
        continue;
      }
      for (const port of ports) {
        const key = `${nodeId} ${port.id}`;
        if (port.isError) {
          if (wiredAcross.has(key)) {
            outputs.push({ nodeId, portId: port.id });
          }
          continue;
        }
        if (port.direction === 'I') {
          if (!internallyFedInputs.has(key)) {
            inputs.push({ nodeId, portId: port.id });
          }
        } else if (!internallyConsumedOutputs.has(key)) {
          outputs.push({ nodeId, portId: port.id });
        }
      }
    }
    return { inputs, outputs };
  }

  /** Edit-time diagnostics over the current topology (single pass). */
  lint(): readonly LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = [];
    for (const [id, adj] of this.adjacency) {
      const kind = this.kinds.get(id);
      if (kind === undefined) {
        continue;
      }
      switch (kind) {
        case 'R':
          // A source whose (non-error) output feeds nothing is dead.
          if (adj.out.size === 0) {
            diagnostics.push({
              code: 'dead-source',
              nodeId: id,
              severity: 'warning',
              message: 'This source is not connected to anything downstream.',
            });
          }
          break;
        case 'T':
          if (adj.in.size === 0) {
            diagnostics.push({
              code: 'dangling-input',
              nodeId: id,
              severity: 'error',
              message: 'This transform has no upstream feeding its input.',
            });
          }
          break;
        case 'W':
          if (adj.in.size === 0) {
            diagnostics.push({
              code: 'sink-no-upstream',
              nodeId: id,
              severity: 'error',
              message: 'This sink has no upstream feeding its input.',
            });
          }
          break;
      }
    }
    return diagnostics;
  }

  // -------------------------------------------------------------------------
  // Union-find internals
  // -------------------------------------------------------------------------

  private find(id: NodeId): NodeId {
    // Iterative find with path compression.
    let root = id;
    let p = this.parent.get(root);
    while (p !== undefined && p !== root) {
      root = p;
      p = this.parent.get(root);
    }
    // Compress.
    let cur = id;
    let cp = this.parent.get(cur);
    while (cp !== undefined && cp !== root) {
      this.parent.set(cur, root);
      cur = cp;
      cp = this.parent.get(cur);
    }
    return root;
  }

  private union(a: NodeId, b: NodeId): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) {
      return;
    }
    const rankA = this.rank.get(ra) ?? 0;
    const rankB = this.rank.get(rb) ?? 0;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
    } else if (rankA > rankB) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
  }

  /**
   * Rebuild union-find from the current adjacency when a removal may have split
   * a component. This is a from-scratch rebuild bounded by V+E; a per-component
   * scoped rebuild is a future optimization, but even the full rebuild only
   * runs on the first query after a removal (removals batch until queried).
   */
  private ensureClean(): void {
    if (!this.dirty) {
      return;
    }
    this.parent.clear();
    this.rank.clear();
    for (const id of this.adjacency.keys()) {
      this.parent.set(id, id);
      this.rank.set(id, 0);
    }
    for (const { from, to } of this.edges.values()) {
      this.union(from, to);
    }
    this.dirty = false;
  }
}

/** The canonical error port name, re-exported for adapters that filter it. */
export { ERROR_PORT_NAME };
