/**
 * RFC 0001, part 2: end of stream. A sender closes its output; an input ends
 * once every connection into it is closed and its messages are done; a
 * Transform closes its outputs when its inputs end; a flow is done when every
 * node is.
 */
import { describe, expect, it, vi } from "vitest";
import { DeliveryQueue } from "../src/core/delivery";
import { portInternals } from "../src/base/port";
import { Flow, FlowDisposedError, Port, ReadableNode, TransformNode, WriteableNode } from "../src/index";
import type { PortAccessor } from "../src/index";

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A Readable that sends `values`, then closes its output. */
class Finite extends ReadableNode {
  constructor(private readonly values: readonly unknown[]) {
    super({});
    Port.O("out").attach(this);
  }

  override _read($o: PortAccessor) {
    for (const value of this.values) {
      $o("out").send(value);
    }
    $o("out").close();
  }
}

/** A Readable the test drives by hand. */
class Manual extends ReadableNode {
  out: Port | undefined;

  constructor() {
    super({});
    Port.O("out").attach(this);
  }

  override _read($o: PortAccessor) {
    this.out = $o("out");
  }
}

/** A Transform that passes values on. */
class Pass extends TransformNode {
  constructor() {
    super({});
    Port.I("in").attach(this);
    Port.O("out").attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor) {
    $i("in").receive((value: unknown) => {
      $o("out").send(value);
    });
  }
}

/** A Transform that sums numbers and sends the total when its input ends. */
class Total extends TransformNode {
  constructor() {
    super({});
    Port.I("in").attach(this);
    Port.O("out").attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor) {
    let total = 0;
    $i("in").receive(
      (value: unknown) => {
        if (typeof value === "number") total += value;
      },
      {
        end: () => {
          $o("out").send(total);
        },
      },
    );
  }
}

/** A Writable that records values and the end of its input. */
class Record extends WriteableNode {
  readonly events: unknown[] = [];

  constructor(inputs: readonly string[] = ["in"]) {
    super({});
    for (const name of inputs) Port.I(name).attach(this);
    this.inputs = inputs;
  }

  readonly inputs: readonly string[];

  override _write($i: PortAccessor) {
    for (const name of this.inputs) {
      $i(name).receive((value: unknown) => this.events.push(value), {
        end: () => this.events.push(`end:${name}`),
      });
    }
  }
}

describe("end of stream (RFC 0001)", () => {
  it("ends an input after every message sent before the close", () => {
    const source = new Finite([1, 2, 3]);
    const sink = new Record();
    source.O("out").connect(sink.I("in"));
    new Flow().run(source);
    expect(sink.events).toEqual([1, 2, 3, "end:in"]);
  });

  it("carries the end through Transforms, which close their outputs when their inputs end", () => {
    const source = new Finite(["a"]);
    const a = new Pass();
    const b = new Pass();
    const sink = new Record();
    source.O("out").connect(a.I("in"));
    a.O("out").connect(b.I("in"));
    b.O("out").connect(sink.I("in"));
    new Flow().run(source);
    expect(sink.events).toEqual(["a", "end:in"]);
  });

  it("lets a node act on the end of its input: a total sent once all numbers are in", () => {
    const source = new Finite([1, 2, 3, 4]);
    const total = new Total();
    const sink = new Record();
    source.O("out").connect(total.I("in"));
    total.O("out").connect(sink.I("in"));
    new Flow().run(source);
    expect(sink.events).toEqual([10, "end:in"]);
  });

  it("ends an input fed by several senders only when all of them have closed", () => {
    const first = new Manual();
    const second = new Manual();
    const sink = new Record();
    first.O("out").connect(sink.I("in"));
    second.O("out").connect(sink.I("in"));
    const flow = new Flow();
    flow.run(first);
    flow.run(second);
    first.out?.close();
    expect(sink.events).toEqual([]);
    second.out?.send("late");
    second.out?.close();
    expect(sink.events).toEqual(["late", "end:in"]);
  });

  it("ends an input only once its asynchronous work is done", async () => {
    const source = new Manual();
    const done: (() => void)[] = [];
    const events: unknown[] = [];
    class Slow extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor) {
        $i("in").receive(
          (value: unknown) =>
            new Promise<void>((resolve) => {
              events.push(value);
              done.push(() => {
                events.push(`done:${String(value)}`);
                resolve();
              });
            }),
          { end: () => events.push("end") },
        );
      }
    }
    source.O("out").connect(new Slow().I("in"), { capacity: 2 });
    new Flow().run(source);
    source.out?.send(1);
    source.out?.send(2);
    source.out?.close();
    expect(events).toEqual([1]);
    done.shift()?.();
    await settle();
    done.shift()?.();
    await settle();
    expect(events).toEqual([1, "done:1", 2, "done:2", "end"]);
  });

  it("reaches every branch of a fan-out", () => {
    const source = new Finite([1]);
    const left = new Record();
    const right = new Record();
    source.O("out").connect(left.I("in"));
    source.O("out").connect(right.I("in"));
    new Flow().run(source);
    expect([left.events, right.events]).toEqual([
      [1, "end:in"],
      [1, "end:in"],
    ]);
  });

  it("is done once every node has finished", async () => {
    const source = new Finite([1, 2]);
    const pass = new Pass();
    const sink = new Record();
    source.O("out").connect(pass.I("in"));
    pass.O("out").connect(sink.I("in"));
    const flow = new Flow();
    flow.run(source);
    await expect(flow.done).resolves.toBeUndefined();
  });

  it("is not done while a source stays open", async () => {
    const source = new Manual();
    const sink = new Record();
    source.O("out").connect(sink.I("in"));
    const flow = new Flow();
    flow.run(source);
    let done = false;
    void flow.done.then(() => {
      done = true;
    });
    await settle();
    expect(done).toBe(false);
    source.out?.close();
    await settle();
    expect(done).toBe(true);
  });

  it("rejects done when the flow is disposed first", async () => {
    const source = new Manual();
    source.O("out").connect(new Record().I("in"));
    const flow = new Flow();
    flow.run(source);
    const done = flow.done;
    flow.dispose();
    await expect(done).rejects.toBeInstanceOf(FlowDisposedError);
  });

  it("keeps a Transform that opts out open after its inputs end", () => {
    class Keeps extends TransformNode {
      override readonly closesWithInputs = false;
      out: Port | undefined;

      constructor() {
        super({});
        Port.I("in").attach(this);
        Port.O("out").attach(this);
      }

      override _transform(_$i: PortAccessor, $o: PortAccessor) {
        this.out = $o("out");
      }
    }
    const source = new Finite([]);
    const keeps = new Keeps();
    const sink = new Record();
    source.O("out").connect(keeps.I("in"));
    keeps.O("out").connect(sink.I("in"));
    new Flow().run(source);
    keeps.out?.send("after");
    expect(sink.events).toEqual(["after"]);
    keeps.out?.close();
    expect(sink.events).toEqual(["after", "end:in"]);
  });

  it("does not end the nodes of a feedback loop by itself", () => {
    // A Transform fed by its own output: one of its senders is itself, which
    // only closes when its inputs end. As in JavaFBP, a loop ends when one of
    // its nodes closes explicitly.
    class Countdown extends TransformNode {
      ended = false;

      constructor() {
        super({});
        Port.I("in").attach(this);
        Port.O("again").attach(this);
      }

      override _transform($i: PortAccessor, $o: PortAccessor) {
        $i("in").receive(
          (value: unknown) => {
            if (typeof value === "number" && value > 0) $o("again").send(value - 1);
          },
          { end: () => (this.ended = true) },
        );
      }
    }
    const source = new Finite([3]);
    const countdown = new Countdown();
    source.O("out").connect(countdown.I("in"));
    countdown.O("again").connect(countdown.I("in"));
    new Flow().run(source);
    expect(countdown.ended).toBe(false);
  });

  it("refuses a send on a closed output", () => {
    const port = Port.O("out");
    port.close();
    expect(() => port.send(1)).toThrow('Port "out" is closed');
  });

  it("closes the error port of a node that has finished", () => {
    const source = new Finite([1]);
    const pass = new Pass();
    const errors = new Record();
    const sink = new Record();
    source.O("out").connect(pass.I("in"));
    pass.O("out").connect(sink.I("in"));
    pass.E().connect(errors.I("in"));
    new Flow().run(source);
    expect(errors.events).toEqual(["end:in"]);
  });

  it("ends in order in a sliced flow too", () => {
    let time = 0;
    const continuations: (() => void)[] = [];
    const source = new Finite([1, 2, 3]);
    const step = new Pass();
    const sink = new Record();
    source.O("out").connect(step.I("in"));
    step.O("out").connect(sink.I("in"));
    sink.I("in").receive(() => {
      time += 1;
    });
    new Flow({ slice: { budgetMs: 0, now: () => time, yieldTo: (resume) => continuations.push(resume) } }).run(source);
    for (let next = continuations.shift(); next !== undefined; next = continuations.shift()) next();
    expect(sink.events).toEqual([1, 2, 3, "end:in"]);
  });

  it("rejects done asked for after the flow is disposed", async () => {
    const flow = new Flow();
    flow.dispose();
    await expect(flow.done).rejects.toBeInstanceOf(FlowDisposedError);
  });

  it("is done at once when it runs nothing that is still open", async () => {
    await expect(new Flow().done).resolves.toBeUndefined();
  });

  it("ignores an output closed after the flow is disposed", () => {
    const source = new Manual();
    const sink = new Record();
    source.O("out").connect(sink.I("in"));
    const flow = new Flow();
    flow.run(source);
    flow.dispose();
    source.out?.close();
    expect(sink.events).toEqual([]);
  });

  it("routes an end handler that throws as a failure", () => {
    const failure = new Error("end failed");
    const onError = vi.fn();
    class Throws extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor) {
        $i("in").receive(() => undefined, {
          end: () => {
            throw failure;
          },
        });
      }
    }
    const source = new Finite([]);
    const sink = new Throws();
    source.O("out").connect(sink.I("in"));
    new Flow({ onError }).run(source);
    expect(onError).toHaveBeenCalledWith(failure, sink);
  });

  it("closes only outputs, and only once", () => {
    expect(() => {
      Port.I("in").close();
    }).toThrow("Only an output port can be closed");
    const port = Port.O("out");
    port.close();
    expect(() => {
      port.close();
    }).not.toThrow();
  });

  it("ends an input once, however often it is told", () => {
    const port = Port.I("in");
    const ends: number[] = [];
    port.receive(() => undefined, { end: () => ends.push(1) });
    portInternals.end(port);
    portInternals.end(port);
    expect(ends).toEqual([1]);
  });

  it("waits for the next slice to end an input when the slice is spent", () => {
    let time = 0;
    const continuations: (() => void)[] = [];
    const source = new Finite([1]);
    const sink = new Record();
    source.O("out").connect(sink.I("in"));
    sink.I("in").receive(() => {
      time += 1;
    });
    new Flow({ slice: { budgetMs: 0, now: () => time, yieldTo: (resume) => continuations.push(resume) } }).run(source);
    expect(sink.events).toEqual([1]);
    for (let next = continuations.shift(); next !== undefined; next = continuations.shift()) next();
    expect(sink.events).toEqual([1, "end:in"]);
  });

  it("runs no task on a closed queue", () => {
    const queue = new DeliveryQueue();
    const ran: number[] = [];
    queue.close();
    queue.schedule(() => ran.push(1));
    expect(ran).toEqual([]);
  });
});
