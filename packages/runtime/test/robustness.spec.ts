/**
 * The engine's guarantees under load and failure: delivery runs in constant
 * stack depth however long the graph, a failing handler never breaks its
 * connection, and messages on one connection arrive in the order they were sent.
 */
import { describe, expect, it, vi } from "vitest";
import { Flow, Port, TransformNode, WriteableNode } from "../src/index";
import type { AnyNode, PortAccessor, ReadableNode } from "../src/index";
import { Apply, asNumber, Collect, Values } from "./helpers";

/** A Transform that fails on one value and passes every other one through. */
class FailOn extends TransformNode {
  constructor(private readonly bad: number) {
    super({});
    Port.I("in").attach(this);
    Port.O("out").attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor) {
    $i("in").receive((value) => {
      if (asNumber(value) === this.bad) {
        throw new Error(`bad ${String(value)}`);
      }
      $o("out").send(value);
    });
  }
}

/** Runs a chain of `length` Transforms from one value; returns what arrived and the stack depth at arrival. */
function runChain(length: number): { readonly arrived: unknown; readonly depth: number } {
  let arrived: unknown;
  let depth = 0;
  class Probe extends WriteableNode {
    constructor() {
      super({});
      Port.I("in").attach(this);
    }

    override _write($i: PortAccessor) {
      $i("in").receive((value) => {
        arrived = value;
        depth = stackDepth();
      });
    }
  }
  const source = new Values([0]);
  let previous: ReadableNode | TransformNode = source;
  for (let index = 0; index < length; index += 1) {
    const step = new Apply((value) => asNumber(value) + 1);
    previous.O("out").connect(step.I("in"));
    previous = step;
  }
  previous.O("out").connect(new Probe().I("in"));
  new Flow().run(source);
  return { arrived, depth };
}

/** The number of frames on the call stack where it is called. */
function stackDepth(): number {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = Number.POSITIVE_INFINITY;
  try {
    return (new Error().stack ?? "").split("\n").length;
  } finally {
    Error.stackTraceLimit = limit;
  }
}

describe("delivery", () => {
  it("delivers at the same stack depth however long the chain is", () => {
    const short = runChain(10);
    const long = runChain(5000);
    expect(short.arrived).toBe(10);
    expect(long.arrived).toBe(5000);
    expect(long.depth).toBe(short.depth);
  });

  it("keeps the order of messages on one connection", () => {
    const values = Array.from({ length: 1000 }, (_, index) => index);
    const source = new Values(values);
    const step = new Apply((value) => value);
    const sink = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));

    new Flow().run(source);

    expect(sink.seen).toEqual(values);
  });

  it("delivers a feedback loop's values in the order they are produced", () => {
    const source = new Values([0]);
    const step = new Apply((value) => asNumber(value) + 1);
    const back = new (class extends TransformNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
        Port.O("out").attach(this);
      }

      override _transform($i: PortAccessor, $o: PortAccessor) {
        $i("in").receive((value) => {
          if (asNumber(value) < 3) $o("out").send(value);
        });
      }
    })();
    const sink = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(back.I("in"));
    back.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));

    new Flow().run(source);

    expect(sink.seen).toEqual([1, 2, 3]);
  });
});

describe("failure", () => {
  it("sends what a Transform's handler throws to its error port and keeps the connection", () => {
    const source = new Values([1, 2, 3]);
    const step = new FailOn(2);
    const sink = new Collect();
    const errors = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));
    step.E().connect(errors.I("in"));

    new Flow().run(source);

    expect(sink.seen).toEqual([1, 3]);
    expect(errors.seen).toEqual([new Error("bad 2")]);
  });

  it("hands what a Writable's handler throws to the flow and keeps the connection", () => {
    const failures: { error: unknown; node: AnyNode | null }[] = [];
    const seen: unknown[] = [];
    class Picky extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor) {
        $i("in").receive((value) => {
          if (value === "b") throw new Error("no b");
          seen.push(value);
        });
      }
    }
    const source = new Values(["a", "b", "c"]);
    const sink = new Picky();
    source.O("out").connect(sink.I("in"));

    new Flow({ onError: (error, node) => failures.push({ error, node }) }).run(source);

    expect(seen).toEqual(["a", "c"]);
    expect(failures).toEqual([{ error: new Error("no b"), node: sink }]);
  });

  it("rethrows a failure no one handles asynchronously, after delivery goes on", () => {
    const scheduled: (() => void)[] = [];
    const spy = vi.spyOn(globalThis, "queueMicrotask").mockImplementation((task) => {
      scheduled.push(task);
    });
    try {
      const seen: unknown[] = [];
      class Picky extends WriteableNode {
        constructor() {
          super({});
          Port.I("in").attach(this);
        }

        override _write($i: PortAccessor) {
          $i("in").receive((value) => {
            if (value === 1) throw new Error("one");
            seen.push(value);
          });
        }
      }
      const source = new Values([1, 2]);
      const sink = new Picky();
      source.O("out").connect(sink.I("in"));

      new Flow().run(source);

      expect(seen).toEqual([2]);
      expect(scheduled).toHaveLength(1);
      expect(() => scheduled[0]?.()).toThrow("one");
    } finally {
      spy.mockRestore();
    }
  });
});
