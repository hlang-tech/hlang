import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SLICE_BUDGET_MS, Flow, Port, ReadableNode, TransformNode, yieldToRuntime } from "../src/index";
import { DeliveryQueue } from "../src/core/delivery";
import type { PortAccessor } from "../src/index";
import { Apply, Collect, Values } from "./helpers";

/** A clock and a yield the test drives by hand. */
function manual() {
  let time = 0;
  const continuations: (() => void)[] = [];
  return {
    now: (): number => time,
    advance: (ms: number): void => {
      time += ms;
    },
    yieldTo: (resume: () => void): void => {
      continuations.push(resume);
    },
    /** Runs the next slice; returns whether there was one. */
    resume: (): boolean => {
      const next = continuations.shift();
      next?.();
      return next !== undefined;
    },
    get waiting(): number {
      return continuations.length;
    },
  };
}

/** A Transform whose handler takes `ms` of the injected clock, then passes the value on. */
function work(clock: { advance(ms: number): void }, ms: number): Apply {
  return new Apply((value) => {
    clock.advance(ms);
    return value;
  });
}

/** A Readable the test sends through by hand, as a timer or a socket would. */
class Manual extends ReadableNode {
  #out: Port | undefined;

  constructor() {
    super({});
    Port.O("out").attach(this);
  }

  override _read($o: PortAccessor) {
    this.#out = $o("out");
  }

  emit(value: unknown): void {
    this.#out?.send(value);
  }
}

/** Two Transforms feeding each other with no asynchronous step: a loop that never ends by itself. */
function feedbackLoop(counter: { count: number }) {
  class Echo extends TransformNode {
    constructor() {
      super({});
      Port.I("in").attach(this);
      Port.O("out").attach(this);
    }

    override _transform($i: PortAccessor, $o: PortAccessor) {
      $i("in").receive((value: unknown) => {
        counter.count += 1;
        $o("out").send(value);
      });
    }
  }
  const start = new Values([1]);
  const a = new Echo();
  const b = new Echo();
  start.O("out").connect(a.I("in"));
  a.O("out").connect(b.I("in"));
  b.O("out").connect(a.I("in"));
  return start;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("FlowOptions.slice", () => {
  it("yields once a slice has used its budget, and resumes where it stopped", () => {
    const clock = manual();
    const source = new Values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const step = work(clock, 1);
    const sink = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));

    new Flow({ slice: { budgetMs: 3, now: clock.now, yieldTo: clock.yieldTo } }).run(source);

    // run() returned with the rest still to come in later slices.
    expect(sink.seen.length).toBeGreaterThan(0);
    expect(sink.seen.length).toBeLessThan(10);
    expect(clock.waiting).toBe(1);
    while (clock.resume()) {
      // each slice delivers until its budget is spent, then schedules the next
    }
    expect(sink.seen).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("keeps first-in first-out order across slices, for messages sent while paused too", () => {
    const clock = manual();
    const source = new Manual();
    const step = work(clock, 1);
    const sink = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));
    new Flow({ slice: { budgetMs: 0, now: clock.now, yieldTo: clock.yieldTo } }).run(source);

    source.emit("a");
    source.emit("b");
    expect(clock.waiting).toBe(1);
    source.emit("c"); // sent while the flow is paused: queued behind what is pending
    while (clock.resume()) {
      // drain
    }
    expect(sink.seen).toEqual(["a", "b", "c"]);
  });

  it("drops what is queued when the flow is disposed while paused", () => {
    const clock = manual();
    const source = new Values([1, 2, 3]);
    const step = work(clock, 1);
    const sink = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));
    const flow = new Flow({ slice: { budgetMs: 0, now: clock.now, yieldTo: clock.yieldTo } });
    flow.run(source);
    const before = [...sink.seen];

    flow.dispose();
    while (clock.resume()) {
      // a continuation scheduled before dispose does nothing
    }
    expect(sink.seen).toEqual(before);
  });

  it("does not hold up another flow while it is paused", () => {
    const clock = manual();
    const slow = new Values([1, 2, 3]);
    const slowStep = work(clock, 1);
    slow.O("out").connect(slowStep.I("in"));
    slowStep.O("out").connect(new Collect().I("in"));
    new Flow({ slice: { budgetMs: 0, now: clock.now, yieldTo: clock.yieldTo } }).run(slow);
    expect(clock.waiting).toBe(1);

    const other = new Values(["x", "y"]);
    const otherSink = new Collect();
    other.O("out").connect(otherSink.I("in"));
    new Flow().run(other);

    expect(otherSink.seen).toEqual(["x", "y"]);
  });

  it("never blocks on a synchronous feedback loop, and stops it on dispose", async () => {
    const counter = { count: 0 };
    const flow = new Flow({ slice: { budgetMs: 1 } });
    flow.run(feedbackLoop(counter));
    // run() returned, and the event loop is free: this timer fires.
    await pause(30);
    const running = counter.count;
    expect(running).toBeGreaterThan(0);
    await pause(30);
    expect(counter.count).toBeGreaterThan(running);

    flow.dispose();
    const stopped = counter.count;
    await pause(30);
    expect(counter.count).toBe(stopped);
  });

  it("rejects a budget that is negative or not a number", () => {
    expect(() => new Flow({ slice: { budgetMs: -1 } })).toThrow("budgetMs must be a finite number of milliseconds, 0 or more");
    expect(() => new Flow({ slice: { budgetMs: Number.NaN } })).toThrow("budgetMs must be a finite number of milliseconds, 0 or more");
  });

  it("defers what a task sends once the task's slice is spent, then delivers it in order", () => {
    const clock = manual();
    const source = new Manual();
    const step = work(clock, 2);
    const sink = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));
    new Flow({ slice: { budgetMs: 3, now: clock.now, yieldTo: clock.yieldTo } }).run(source);

    // One task sends many values, as a source looping over a range does.
    for (let value = 1; value <= 6; value += 1) {
      source.emit(value);
    }
    expect(sink.seen.length).toBeLessThan(6);
    while (clock.resume()) {
      // drain
    }
    expect(sink.seen).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("ignores a scheduled slice once the flow is disposed, however it paused", () => {
    const clock = manual();
    const source = new Manual();
    const step = work(clock, 5);
    const sink = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));
    const flow = new Flow({ slice: { budgetMs: 1, now: clock.now, yieldTo: clock.yieldTo } });
    flow.run(source);
    source.emit(1); // spends the slice
    source.emit(2); // deferred at send
    flow.dispose();
    while (clock.resume()) {
      // nothing left to deliver
    }
    expect(sink.seen).toEqual([]);
  });

  it("slices with the default budget when given no options", () => {
    expect(DEFAULT_SLICE_BUDGET_MS).toBe(5);
    const sink = new Collect();
    const source = new Values([1, 2]);
    source.O("out").connect(sink.I("in"));
    new Flow({ slice: {} }).run(source);
    expect(sink.seen).toEqual([1, 2]);
  });
});

describe("yieldToRuntime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses setImmediate where the runtime has it (Node.js, Bun)", async () => {
    const order: string[] = [];
    const done = new Promise<void>((resolve) => {
      yieldToRuntime(() => {
        order.push("resumed");
        resolve();
      });
    });
    order.push("yielded");
    await done;
    expect(order).toEqual(["yielded", "resumed"]);
  });

  it("uses a MessageChannel without setImmediate (browsers, Deno, workers), in order", async () => {
    vi.stubGlobal("setImmediate", undefined);
    const order: number[] = [];
    await new Promise<void>((resolve) => {
      yieldToRuntime(() => order.push(1));
      yieldToRuntime(() => {
        order.push(2);
        resolve();
      });
    });
    expect(order).toEqual([1, 2]);
  });

  it("falls back to setTimeout where neither exists", async () => {
    vi.stubGlobal("setImmediate", undefined);
    vi.stubGlobal("MessageChannel", undefined);
    await new Promise<void>((resolve) => {
      yieldToRuntime(resolve);
    });
    expect(true).toBe(true);
  });
});

describe("DeliveryQueue", () => {
  it("delivers nothing once closed", () => {
    const queue = new DeliveryQueue();
    const port = Port.I("in");
    const seen: unknown[] = [];
    port.receive((value: unknown) => seen.push(value));
    queue.deliver(port, 1);
    queue.close();
    queue.deliver(port, 2);
    expect(seen).toEqual([1]);
  });
});
