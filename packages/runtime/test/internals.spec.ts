import { describe, expect, it } from "vitest";
import build from "../src/core/build";
import uuid from "../src/utils/uuid";
import { Apply, Collect, Values } from "./helpers";

describe("build", () => {
  it("visits each node once and each connection once", () => {
    // source -> left, right -> merge (reached twice) -> sink
    const source = new Values([]);
    const left = new Apply((value) => value);
    const right = new Apply((value) => value);
    const merge = new Apply((value) => value);
    const sink = new Collect();
    source.O("out").connect(left.I("in"));
    source.O("out").connect(right.I("in"));
    left.O("out").connect(merge.I("in"));
    right.O("out").connect(merge.I("in"));
    merge.O("out").connect(sink.I("in"));

    const graph = build(source);

    expect(graph.readable).toEqual([source]);
    expect(new Set(graph.transform)).toEqual(new Set([left, right, merge]));
    expect(graph.transform).toHaveLength(3);
    expect(graph.writable).toEqual([sink]);
    expect(graph.connections.get(source.id)).toHaveLength(2);
    expect(graph.connections.get(merge.id)).toHaveLength(1);
    expect(graph.connections.has(sink.id)).toBe(false);
  });

  it("ends a feedback loop by not expanding a node twice", () => {
    const source = new Values([]);
    const a = new Apply((value) => value);
    const b = new Apply((value) => value);
    source.O("out").connect(a.I("in"));
    a.O("out").connect(b.I("in"));
    b.O("out").connect(a.I("in"));

    const graph = build(source);

    expect(graph.transform).toHaveLength(2);
    expect(graph.connections.get(b.id)?.[0]?.dst).toBe(a.I("in"));
  });

  it("builds a chain of 200,000 nodes without recursion", () => {
    const source = new Values([]);
    let previous: Values | Apply = source;
    for (let index = 0; index < 200_000; index += 1) {
      const step = new Apply((value) => value);
      previous.O("out").connect(step.I("in"));
      previous = step;
    }
    expect(build(source).transform).toHaveLength(200_000);
  });
});

describe("uuid", () => {
  it("hands out distinct v4 ids without remembering them", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuid.create()));
    expect(ids.size).toBe(1000);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
