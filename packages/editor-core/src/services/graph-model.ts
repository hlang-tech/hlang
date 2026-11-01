/**
 * `GraphModel` — the authoritative in-memory graph document.
 *
 * Pure data: no RxJS, no runtime objects, no React. All higher-level intent
 * (with validation + history) flows through the command service; this model
 * exposes the low-level, synchronous mutations those commands build on.
 */

import type {
  EdgeBounds,
  EditorEdge,
  EditorNode,
  EdgeId,
  GraphSnapshot,
  NodeId,
  ParamBag,
  Point,
} from '../model/types';
import type { IGraphModel } from './interfaces';

export class GraphModel implements IGraphModel {
  private readonly nodes = new Map<NodeId, EditorNode>();
  private readonly edges = new Map<EdgeId, EditorEdge>();

  getNode(id: NodeId): EditorNode | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: EdgeId): EditorEdge | undefined {
    return this.edges.get(id);
  }

  getNodes(): readonly EditorNode[] {
    return [...this.nodes.values()];
  }

  getEdges(): readonly EditorEdge[] {
    return [...this.edges.values()];
  }

  addNode(node: EditorNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`GraphModel: node "${node.id}" already exists.`);
    }
    this.nodes.set(node.id, node);
  }

  removeNode(id: NodeId): void {
    if (!this.nodes.has(id)) {
      throw new Error(`GraphModel: node "${id}" does not exist.`);
    }
    // Cascade: drop every incident edge first.
    for (const edge of this.incidentEdges(id)) {
      this.edges.delete(edge.id);
    }
    this.nodes.delete(id);
  }

  updateNodeParams(id: NodeId, params: ParamBag): void {
    const node = this.requireNode(id);
    this.nodes.set(id, { ...node, params });
  }

  updateNodePosition(id: NodeId, position: Point): void {
    const node = this.requireNode(id);
    this.nodes.set(id, { ...node, position });
  }

  updateNodeName(id: NodeId, name: string): void {
    const node = this.requireNode(id);
    this.nodes.set(id, { ...node, name });
  }

  updateEdgeBounds(id: EdgeId, bounds: EdgeBounds): void {
    const edge = this.edges.get(id);
    if (edge === undefined) {
      throw new Error(`GraphModel: edge "${id}" does not exist.`);
    }
    this.edges.set(id, { id: edge.id, source: edge.source, target: edge.target, ...bounds });
  }

  addEdge(edge: EditorEdge): void {
    if (this.edges.has(edge.id)) {
      throw new Error(`GraphModel: edge "${edge.id}" already exists.`);
    }
    if (!this.nodes.has(edge.source.nodeId)) {
      throw new Error(`GraphModel: edge source node "${edge.source.nodeId}" does not exist.`);
    }
    if (!this.nodes.has(edge.target.nodeId)) {
      throw new Error(`GraphModel: edge target node "${edge.target.nodeId}" does not exist.`);
    }
    this.edges.set(edge.id, edge);
  }

  removeEdge(id: EdgeId): void {
    if (!this.edges.has(id)) {
      throw new Error(`GraphModel: edge "${id}" does not exist.`);
    }
    this.edges.delete(id);
  }

  incidentEdges(nodeId: NodeId): readonly EditorEdge[] {
    const result: EditorEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.source.nodeId === nodeId || edge.target.nodeId === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  snapshot(): GraphSnapshot {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges.values()],
    };
  }

  restore(snapshot: GraphSnapshot): void {
    this.nodes.clear();
    this.edges.clear();
    for (const node of snapshot.nodes) {
      this.nodes.set(node.id, node);
    }
    for (const edge of snapshot.edges) {
      this.edges.set(edge.id, edge);
    }
  }

  private requireNode(id: NodeId): EditorNode {
    const node = this.nodes.get(id);
    if (node === undefined) {
      throw new Error(`GraphModel: node "${id}" does not exist.`);
    }
    return node;
  }
}
