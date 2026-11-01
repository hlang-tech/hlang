import { afterEach, describe, expect, it, vi } from "vitest";
import Graph, { Edge, Vertex } from "../src/core/graph";
import uuid from "../src/utils/uuid";

afterEach(() => {
  vi.restoreAllMocks();
});

interface Item {
  readonly id: string;
}

function graphOf(edges: readonly (readonly [string, string])[]): Graph<string, Item> {
  const graph = new Graph<string, Item>();
  const items = new Map<string, Item>();
  const item = (id: string): Item => {
    const existing = items.get(id);
    if (existing !== undefined) return existing;
    const created = { id };
    items.set(id, created);
    graph.addVertex(new Vertex(created));
    return created;
  };
  for (const [from, to] of edges) {
    graph.addEdge(new Edge(item(from), item(to), `${from}->${to}`));
  }
  return graph;
}

describe("Graph", () => {
  it("keeps every edge between the same two vertices", () => {
    const graph = graphOf([
      ["a", "b"],
      ["a", "b"],
    ]);
    expect(graph.edgesFrom("a")).toEqual(["a->b", "a->b"]);
    expect(graph.edgesFrom("b")).toEqual([]);
  });

  it("adds the vertices of an edge it has not seen", () => {
    const graph = new Graph<string, Item>();
    graph.addEdge(new Edge({ id: "x" }, { id: "y" }, "x->y"));
    expect([...graph.vertices.keys()]).toEqual(["x", "y"]);
    expect(graph.vertices.get("y")?.data).toEqual({ id: "y" });
  });

  it("finds a destination through intermediate vertices, and remembers it", () => {
    const graph = graphOf([
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
    ]);
    expect(graph.hasDest("b", "d")).toBe(true);
    // a -> b is not d, but b is now known to reach d.
    expect(graph.hasDest("a", "d")).toBe(true);
    expect(graph.hasDest("d", "a")).toBe(false);
    expect(graph.hasDest("missing", "a")).toBe(false);
  });

  it("tells when joining two vertices closes a cycle", () => {
    const graph = graphOf([
      ["a", "b"],
      ["b", "c"],
    ]);
    expect(graph.isCircled({ id: "c" }, { id: "a" })).toBe(true);
    expect(graph.isCircled({ id: "a" }, { id: "a" })).toBe(true);
    expect(graph.isCircled({ id: "a" }, { id: "c" })).toBe(false);
  });
});

describe("uuid", () => {
  it("hands out distinct v4 ids", () => {
    const first = uuid.create();
    const second = uuid.create();
    expect(first).not.toBe(second);
    expect(uuid.validate(first)).toBe(false);
  });

  it("refuses an invalid id and a duplicate, and forgets a deleted one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(uuid.validate("not-a-uuid")).toBe(false);
    const id = uuid.create();
    expect(uuid.validate(id)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(uuid.delete(id).has(id)).toBe(false);
    expect(uuid.validate(id)).toBe(true);
  });
});
