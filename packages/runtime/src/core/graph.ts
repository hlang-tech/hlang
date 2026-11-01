/** Anything stored as a vertex: it is keyed by its `id`. */
interface Identified {
  readonly id: string;
}

const keyOf = (item: Identified): string => item.id;

/**
 * A directed graph of vertices `K` joined by edges carrying data `T`. `adjList` keeps
 * one entry per pair of vertices, which is enough for reachability; `outEdges`
 * keeps every edge, since two vertices can be joined by several (one per pair
 * of ports) and each must be wired.
 */
export default class Graph<T, K extends Identified> {
  readonly vertices = new Map<string, Vertex<K>>();
  readonly adjList = new Matrix<T>();
  /** Cache of the pairs already known to be connected. */
  readonly connectedMatrix = new Matrix<boolean>();
  readonly outEdges = new Map<string, T[]>();

  addVertex(vertex: Vertex<K>): void {
    const key = keyOf(vertex.data);
    if (this.vertices.has(key)) {
      return;
    }
    this.vertices.set(key, vertex);
    this.adjList.setRow(key);
  }

  addEdge(edge: Edge<T, K>): void {
    const { v1, v2, data } = edge;
    const k1 = keyOf(v1);
    const k2 = keyOf(v2);

    if (!this.vertices.has(k1)) this.vertices.set(k1, new Vertex(v1));
    if (!this.vertices.has(k2)) this.vertices.set(k2, new Vertex(v2));

    this.adjList.set(k1, k2, data);
    this.addOutEdge(k1, data);
  }

  /** Every edge leaving the vertex `key`, in the order they were added. */
  edgesFrom(key: string): readonly T[] {
    return this.outEdges.get(key) ?? [];
  }

  /** Whether `to` can be reached from `from` along directed edges. */
  hasDest(from: string, to: string, visited = new Set<string>()): boolean {
    if (visited.has(from)) return false;
    visited.add(from);

    if (this.connectedMatrix.get(from, to) === true) return true;
    if (!this.adjList.hasRow(from)) return false;
    if (this.adjList.get(from, to) !== undefined) {
      this.connectedMatrix.set(from, to, true);
      return true;
    }
    for (const dest of this.adjList.cols(from)) {
      if (this.connectedMatrix.get(dest, to) === true) {
        this.connectedMatrix.set(from, to, true);
        return true;
      }
      if (this.hasDest(dest, to, new Set([...visited]))) return true;
    }

    return false;
  }

  /** Whether joining `prev` to `next` closes a cycle. */
  isCircled(prev: K, next: K): boolean {
    const pk = keyOf(prev);
    const nk = keyOf(next);
    if (pk === nk) return true;
    return this.hasDest(nk, pk);
  }

  private addOutEdge(key: string, data: T): void {
    const edges = this.outEdges.get(key);
    if (edges === undefined) {
      this.outEdges.set(key, [data]);
    } else {
      edges.push(data);
    }
  }
}

export class Vertex<T> {
  readonly data: T;
  visited = false;

  constructor(data: T) {
    this.data = data;
  }
}

export class Edge<T, K> {
  readonly v1: K;
  readonly v2: K;
  readonly data: T;

  constructor(v1: K, v2: K, data: T) {
    this.v1 = v1;
    this.v2 = v2;
    this.data = data;
  }
}

/** A sparse matrix of `T`, by row and column key. */
class Matrix<T> {
  private readonly rows = new Map<string, Map<string, T>>();

  setRow(row: string): Map<string, T> {
    const existing = this.rows.get(row);
    if (existing !== undefined) {
      return existing;
    }
    const created = new Map<string, T>();
    this.rows.set(row, created);
    return created;
  }

  hasRow(row: string): boolean {
    return this.rows.has(row);
  }

  set(row: string, col: string, value: T): void {
    this.setRow(row).set(col, value);
  }

  get(row: string, col: string): T | undefined {
    return this.rows.get(row)?.get(col);
  }

  cols(row: string): string[] {
    return Array.from(this.rows.get(row)?.keys() ?? []);
  }
}
