const _ = (k): string => String(k.id);

export default class Graph<T, K> {
  directed: boolean;
  vertices: Map<string, Vertex<K>>;
  adjList: Matrix<T>;
  connectedMatrix: Matrix<boolean>;


  constructor(directed: boolean) {
    // digraph or undigraph
    this.directed = typeof directed === 'undefined' || Boolean(directed);
    // Map<Vertex>
    this.vertices = new Map();
    // Matrix<{src: Port, dest: Port}> Adjacency matrix
    this.adjList = new Matrix();
    // Matrix<boolean> Join matrix cache
    this.connectedMatrix = new Matrix();
  }

  addVertex(v: Vertex<K>) {
    const vk = _(v.data);

    if (this.vertices.has(vk)) return;

    this.vertices.set(vk, v);

    this.adjList.setRow(vk);
  }

  addEdge(e: Edge<T, K>) {
    const { v1, v2, data } = e;

    const v1k = _(v1.data);
    const v2k = _(v2.data);

    if (!this.vertices.has(v1k)) this.vertices.set(v1k, v1);
    if (!this.vertices.has(v2k)) this.vertices.set(v2k, v2);

    this.adjList.set(v1k, v2k, data);

    if (!this.directed) {
      this.adjList.set(v2k, v1k, data);
    }
  }

  // digraph
  hasDest(from: string, to: string) {
    if (this.connectedMatrix.get(from, to)) return true;
    if (!this.adjList.getRow(from)) return false;
    if (this.adjList.get(from, to)) {
      this.connectedMatrix.set(from, to, true);
      return true;
    }
    for (const dest of this.adjList.cols(from)) {
      if (this.connectedMatrix.get(dest, to)) {
        this.connectedMatrix.set(from, to, true);
        return true;
      }
      if (this.hasDest(dest, to)) return true;
    }

    return false;
  }

  isCircled(prev: T, next: T) {
    const pk = _(prev);
    const nk = _(next);
    if (pk === nk) return true;
    return this.hasDest(nk, pk);
  }
}

export class Vertex<T> {
  data: T;
  visited: boolean;

  constructor(data: T) {
    this.data = data;
    this.visited = false;
  }
}



export class Edge<T, K>  {
  data: T;
  v1: Vertex<K>;
  v2: Vertex<K>;

  constructor(v1: K, v2: K, data: T) {
    this.data = data;
    this.v1 = new Vertex<K>(v1);
    this.v2 = new Vertex<K>(v2);
  }
}

class Matrix<T> {
  matrix: Map<string, Map<string, T>>;

  constructor() {
    this.matrix = new Map();

    return this;
  }

  setRow(row: string) {
    if (!this.matrix.has(row)) {
      this.matrix.set(row, new Map());
      // this.matrix[row] = Object.create(null);
    }

    return this.matrix.get(row);
  }

  getRow(row: string): Map<string, T> | null | undefined {
    if (!this.matrix.has(row)) return null;

    return this.matrix.get(row);
  }


  set(row: string, col: string, v: T) {
    this.setRow(row);

    (this.matrix.get(row) as Map<string, T>).set(col, v)
  }

  get(row: string, col: string): T | null | undefined {
    if (!this.matrix.has(row)) return null;

    return (this.matrix.get(row) as Map<string, T>).get(col);
  }

  cols(row): string[] {
    if (!this.matrix) return [];
    if (!this.matrix.has(row)) return [];

    return Array.from((this.matrix.get(row) as Map<string, T>).keys());
  }

  rows(): string[] {
    if (!this.matrix) return [];

    return Array.from(this.matrix.keys());
  }
}

