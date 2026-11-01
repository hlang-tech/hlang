/**
 * `cloneNodesWithEdges` — a pure helper for duplicate/paste in the binding
 * layer. Given a set of nodes and the graph's edges, it produces clones with
 * FRESH ids and offset positions (preserving name/params/ports/raw), and
 * re-wires ONLY the edges internal to the set — an edge is kept iff BOTH of its
 * endpoints are among the cloned nodes, with each endpoint remapped through the
 * old→new id map. Boundary-crossing edges are dropped (the copy is
 * self-contained). No side effects: sources are never mutated.
 *
 * Orchestration (executing AddNode/Connect commands inside a single undo
 * transaction) lives in the binding layer, which owns the id generator and the
 * command service; this stays a deterministic, easily-tested transform.
 */

import type { EditorEdge, EditorNode } from '../model/types';
import type { IIdGenerator } from './id-generator';

/** A canvas-space offset applied to every clone (keeps a paste visually offset). */
export interface CloneOffset {
  readonly dx: number;
  readonly dy: number;
}

/** The result of cloning: new nodes, remapped internal edges, and the id map. */
export interface CloneResult {
  readonly nodes: readonly EditorNode[];
  readonly edges: readonly EditorEdge[];
  /** Maps each source node id to its clone's fresh id. */
  readonly idMap: ReadonlyMap<string, string>;
}

export function cloneNodesWithEdges(
  nodes: readonly EditorNode[],
  edges: readonly EditorEdge[],
  idGenerator: IIdGenerator,
  offset: CloneOffset,
): CloneResult {
  const idMap = new Map<string, string>();
  const cloned: EditorNode[] = nodes.map(node => {
    const id = idGenerator.nextNodeId();
    idMap.set(node.id, id);
    return {
      ...node,
      id,
      position: { x: node.position.x + offset.dx, y: node.position.y + offset.dy },
    };
  });

  const clonedEdges: EditorEdge[] = [];
  for (const edge of edges) {
    const newSource = idMap.get(edge.source.nodeId);
    const newTarget = idMap.get(edge.target.nodeId);
    // Keep only edges wholly inside the copied set; remap both endpoints.
    if (newSource === undefined || newTarget === undefined) {
      continue;
    }
    clonedEdges.push({
      id: idGenerator.nextEdgeId(),
      source: { nodeId: newSource, portId: edge.source.portId },
      target: { nodeId: newTarget, portId: edge.target.portId },
    });
  }

  return { nodes: cloned, edges: clonedEdges, idMap };
}
