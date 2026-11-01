import { map } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { Flow, Port, ReadableNode, TransformNode, WriteableNode } from "../src/index";
import type { PortAccessor } from "../src/index";
import { Apply, asNumber, Collect, Values } from "./helpers";

const ERROR_PORT = "@node/error";

describe("ports", () => {
  it("connects an output to an input and returns the output for chaining", () => {
    const source = new Values(["v"]);
    const out = source.O("out");
    const sink = new Collect();
    expect(out.connect(sink.I("in"))).toBe(out);
    new Flow().run(source);
    expect(sink.seen).toEqual(["v"]);
  });

  it("refuses every other direction", () => {
    const source = new Values([]);
    const step = new Apply((value) => value);
    const sink = new Collect();
    expect(() => sink.I("in").connect(source.O("out"))).toThrow("I can not connect O");
    expect(() => source.O("out").connect(step.O("out"))).toThrow("O can not connect O");
    expect(() => step.I("in").connect(sink.I("in"))).toThrow("I can not connect I");
  });

  it("gives every node and port its own id", () => {
    const a = new Values([]);
    const b = new Values([]);
    expect(a.id).not.toBe(b.id);
    expect(a.O("out").id).not.toBe(b.O("out").id);
    expect(a.O("out").id).not.toBe(a.O(ERROR_PORT).id);
  });

  it("transforms a port's stream through pipe()", () => {
    const port = new Values([]).O("out");
    const seen: unknown[] = [];
    port.pipe(map((value: unknown) => asNumber(value) + 1)).receive((value: unknown) => seen.push(value));
    port.send(1);
    port.send(2);
    expect(seen).toEqual([2, 3]);
  });

  it("resolves a port whose name contains a dot", () => {
    const sink = new Collect(["v1.input"]);
    expect(sink.I("v1.input").name).toBe("v1.input");
  });

  it("names the missing port when a node has no such port", () => {
    const source = new Values([]);
    expect(() => source.I("in")).toThrow('has no input port "in"');
    expect(() => source.O("missing")).toThrow('has no output port "missing"');
  });

  it("still sends after a pipe is set, and receivers get the piped stream", () => {
    const port = new Values([]).O("out");
    const seen: unknown[] = [];
    port.pipe(map((value: unknown) => asNumber(value) * 10)).receive((value: unknown) => seen.push(value));
    port.send(1);
    expect(seen).toEqual([10]);
  });

  it("still receives through the deprecated on() and says so", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const port = new Values([]).O("out");
    const seen: unknown[] = [];
    port.on((value: unknown) => seen.push(value));
    port.send("x");
    expect(seen).toEqual(["x"]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("deperecated"));
  });
});

describe("isolation", () => {
  it("gives a node nothing but its own options and ports", () => {
    class Bare extends ReadableNode {
      constructor() {
        super({});
        Port.O("out").attach(this);
      }
    }
    const node = new Bare();
    new Flow().run(node);

    // No route from a node to the flow that ran it or to any other node.
    expect(Object.keys(node).sort()).toEqual(["I", "O", "id", "identity", "opts", "type"]);
    expect(Object.keys(node.O("out")).sort()).toEqual(["id", "identity", "name", "type"]);
  });

  it("exposes a port's stream read-only", () => {
    const port = new Values([]).O("out");
    expect("next" in port.$).toBe(false);
  });
});

describe("node kinds", () => {
  it("gives Readable and Transform an error output and Writable none", () => {
    const readable = new Values([]);
    const transform = new Apply((value) => value);
    const writable = new Collect();
    expect(readable.O(ERROR_PORT)?.type).toBe("O");
    expect(transform.O(ERROR_PORT)?.type).toBe("O");
    expect(() => writable.O(ERROR_PORT)).toThrow('has no output port "@node/error"');
    expect(writable.E()).toBeUndefined();
  });

  it("tells the three kinds apart by type", () => {
    const kinds = [new Values([]).type, new Apply((value) => value).type, new Collect().type];
    expect(new Set(kinds).size).toBe(3);
    expect(kinds.map((kind) => kind.toString())).toEqual([
      "Symbol(@type/readable)",
      "Symbol(@type/transform)",
      "Symbol(@type/writable)",
    ]);
  });
});

describe("Flow", () => {
  it("starts only from a Readable", () => {
    expect(() => new Flow().run(new Apply((value) => value))).toThrow("Flow must run with a READABLE node.");
    expect(() => new Flow().run(new Collect())).toThrow("Flow must run with a READABLE node.");
  });

  it("runs a Readable, Transform, Writable chain in order", () => {
    const source = new Values([1, 2, 3]);
    const double = new Apply((value) => asNumber(value) * 2);
    const sink = new Collect();
    source.O("out").connect(double.I("in"));
    double.O("out").connect(sink.I("in"));

    new Flow().run(source);

    expect(sink.seen).toEqual([2, 4, 6]);
  });

  it("fans one output out to every connected input", () => {
    const source = new Values(["a", "b"]);
    const left = new Collect();
    const right = new Collect();
    source.O("out").connect(left.I("in"));
    source.O("out").connect(right.I("in"));

    new Flow().run(source);

    expect(left.seen).toEqual(["a", "b"]);
    expect(right.seen).toEqual(["a", "b"]);
  });

  it("fans several outputs into one input", () => {
    const source = new Values([1, 2]);
    const plus = new Apply((value) => asNumber(value) + 10);
    const times = new Apply((value) => asNumber(value) * 10);
    const sink = new Collect();
    source.O("out").connect(plus.I("in"));
    source.O("out").connect(times.I("in"));
    plus.O("out").connect(sink.I("in"));
    times.O("out").connect(sink.I("in"));

    new Flow().run(source);

    expect([...sink.seen].sort((a, b) => asNumber(a) - asNumber(b))).toEqual([10, 11, 12, 20]);
  });

  it("routes values by named port", () => {
    class Split extends TransformNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
        Port.O("even").attach(this);
        Port.O("odd").attach(this);
      }

      override _transform($i: PortAccessor, $o: PortAccessor) {
        $i("in").receive((value) => $o(asNumber(value) % 2 === 0 ? "even" : "odd").send(value));
      }
    }
    const source = new Values([1, 2, 3, 4]);
    const split = new Split();
    const sink = new Collect(["even", "odd"]);
    source.O("out").connect(split.I("in"));
    split.O("even").connect(sink.I("even"));
    split.O("odd").connect(sink.I("odd"));

    new Flow().run(source);

    expect(sink.byPort).toEqual({ even: [2, 4], odd: [1, 3] });
  });

  it("wires one output to two inputs of the same node", () => {
    const source = new Values(["v"]);
    const sink = new Collect(["a", "b"]);
    source.O("out").connect(sink.I("a"));
    source.O("out").connect(sink.I("b"));

    new Flow().run(source);

    expect(sink.byPort).toEqual({ a: ["v"], b: ["v"] });
  });

  it("wires every connection between the same two nodes when it is reached twice", () => {
    // `left` and `right` both lead to `merge`, so the flow reaches `merge` twice;
    // each of its connections to `sink` is still wired exactly once.
    const source = new Values([1]);
    const left = new Apply((value) => value);
    const right = new Apply((value) => value);
    const merge = new (class extends TransformNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
        Port.O("first").attach(this);
        Port.O("second").attach(this);
      }

      override _transform($i: PortAccessor, $o: PortAccessor) {
        $i("in").receive((value) => {
          $o("first").send(value);
          $o("second").send(asNumber(value) * 100);
        });
      }
    })();
    const sink = new Collect(["first", "second"]);
    source.O("out").connect(left.I("in"));
    source.O("out").connect(right.I("in"));
    left.O("out").connect(merge.I("in"));
    right.O("out").connect(merge.I("in"));
    merge.O("first").connect(sink.I("first"));
    merge.O("second").connect(sink.I("second"));

    new Flow().run(source);

    expect(sink.byPort).toEqual({ first: [1, 1], second: [100, 100] });
  });

  it("delivers what a node throws on its error port", () => {
    class Failing extends ReadableNode {
      constructor() {
        super({});
        Port.O("out").attach(this);
      }

      override _read() {
        this.throw(new Error("source failed"));
      }
    }
    const source = new Failing();
    const errors = new Collect();
    source.O(ERROR_PORT).connect(errors.I("in"));

    new Flow().run(source);

    expect(errors.seen).toEqual([new Error("source failed")]);
  });

  it("delivers what a Transform throws on its error port", () => {
    class Failing extends TransformNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _transform($i: PortAccessor) {
        $i("in").receive((value) => {
          this.throw(new Error(`bad ${String(value)}`));
        });
      }
    }
    const source = new Values([1]);
    const step = new Failing();
    const errors = new Collect();
    source.O("out").connect(step.I("in"));
    step.E().connect(errors.I("in"));

    new Flow().run(source);

    expect(errors.seen).toEqual([new Error("bad 1")]);
  });

  it("refuses to run a connection to a port that belongs to no node", () => {
    const source = new Values([1]);
    source.O("out").connect(Port.I("loose"));
    expect(() => new Flow().run(source)).toThrow('Port "loose" is connected but not attached to a node.');
  });

  it("runs each node once and wires each edge once when run again", () => {
    const source = new Values([7]);
    const sink = new Collect();
    source.O("out").connect(sink.I("in"));
    const flow = new Flow();

    flow.run(source);
    flow.run(source);

    expect(source.reads).toBe(1);
    expect(sink.seen).toEqual([7]);
  });

  it("delivers values a Readable sends later, while the flow is live", () => {
    vi.useFakeTimers();
    try {
      class Ticker extends ReadableNode {
        constructor() {
          super({});
          Port.O("out").attach(this);
        }

        override _read($o: PortAccessor) {
          let tick = 0;
          const timer = setInterval(() => {
            tick += 1;
            $o("out").send(tick);
            if (tick === 3) clearInterval(timer);
          }, 100);
        }
      }
      const source = new Ticker();
      const sink = new Collect();
      source.O("out").connect(sink.I("in"));

      new Flow().run(source);
      expect(sink.seen).toEqual([]);
      vi.advanceTimersByTime(250);
      expect(sink.seen).toEqual([1, 2]);
      vi.advanceTimersByTime(1000);
      expect(sink.seen).toEqual([1, 2, 3]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("exposes the writable kind under its historical name", () => {
    expect(new Collect()).toBeInstanceOf(WriteableNode);
  });
});
