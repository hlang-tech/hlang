import { describe, expect, it, vi } from "vitest";
import { Flow, Port, ReadableNode, TransformNode, WriteableNode } from "../src/index";
import type { PortAccessor, Teardown } from "../src/index";
import { Apply, Collect, Values } from "./helpers";

/** A Readable whose sends the test drives by hand, as a timer or socket would. */
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

/** Nodes that each return a teardown recording when it ran. */
function recordingNodes(log: string[]) {
  class Source extends ReadableNode {
    constructor() {
      super({});
      Port.O("out").attach(this);
    }

    override _read($o: PortAccessor): Teardown {
      $o("out").send(1);
      return () => log.push("source");
    }
  }

  class Step extends TransformNode {
    constructor() {
      super({});
      Port.I("in").attach(this);
      Port.O("out").attach(this);
    }

    override _transform($i: PortAccessor, $o: PortAccessor): Teardown {
      $i("in").receive((value: unknown) => $o("out").send(value));
      return () => log.push("step");
    }
  }

  class Sink extends WriteableNode {
    constructor() {
      super({});
      Port.I("in").attach(this);
    }

    override _write($i: PortAccessor): Teardown {
      $i("in").receive((value: unknown) => log.push(`got ${String(value)}`));
      return () => log.push("sink");
    }
  }

  const source = new Source();
  const step = new Step();
  const sink = new Sink();
  source.O("out").connect(step.I("in"));
  step.O("out").connect(sink.I("in"));
  return { source, step, sink };
}

describe("Flow#dispose", () => {
  it("stops delivery: a source that keeps sending reaches no one", () => {
    const source = new Manual();
    const sink = new Collect();
    source.O("out").connect(sink.I("in"));
    const flow = new Flow();
    flow.run(source);

    source.emit(1);
    flow.dispose();
    source.emit(2);

    expect(sink.seen).toEqual([1]);
  });

  it("runs each node's teardown once, the last started first", () => {
    const log: string[] = [];
    const { source } = recordingNodes(log);
    const flow = new Flow();
    flow.run(source);

    flow.dispose();
    flow.dispose();

    expect(log).toEqual(["got 1", "source", "step", "sink"]);
  });

  it("reports whether it is disposed", () => {
    const flow = new Flow();
    expect(flow.disposed).toBe(false);
    flow.dispose();
    expect(flow.disposed).toBe(true);
  });

  it("refuses to run once disposed", () => {
    const flow = new Flow();
    flow.dispose();
    expect(() => flow.run(new Values([]))).toThrow("Flow has been disposed.");
  });

  it("ends the subscriptions nodes made on their own ports", () => {
    const subscriptions: { closed: boolean }[] = [];
    class Keep extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor) {
        subscriptions.push($i("in").receive(() => undefined));
      }
    }
    const source = new Values([1]);
    source.O("out").connect(new Keep().I("in"));
    const flow = new Flow();
    flow.run(source);
    expect(subscriptions.map((s) => s.closed)).toEqual([false]);

    flow.dispose();

    expect(subscriptions.map((s) => s.closed)).toEqual([true]);
  });

  it("completes the ports of the nodes it started, so observers see the end", () => {
    const source = new Manual();
    const sink = new Collect();
    source.O("out").connect(sink.I("in"));
    const complete = vi.fn();
    source.O("out").$.subscribe({ complete });
    const flow = new Flow();
    flow.run(source);

    flow.dispose();

    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("can be disposed from inside a delivery; queued messages are dropped", () => {
    const flow = new Flow();
    const seen: unknown[] = [];
    class StopAtTwo extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor) {
        $i("in").receive((value: unknown) => {
          seen.push(value);
          if (value === 2) {
            flow.dispose();
          }
        });
      }
    }
    const source = new Values([1, 2, 3, 4]);
    const step = new Apply((value) => value);
    source.O("out").connect(step.I("in"));
    step.O("out").connect(new StopAtTwo().I("in"));

    expect(() => flow.run(source)).not.toThrow();
    expect(seen).toEqual([1, 2]);
  });

  it("sends a failing teardown to onError and still runs the others", () => {
    const failure = new Error("teardown failed");
    const onError = vi.fn();
    const log: string[] = [];
    class Faulty extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write(): Teardown {
        return () => {
          throw failure;
        };
      }
    }
    class Fine extends ReadableNode {
      constructor() {
        super({});
        Port.O("out").attach(this);
      }

      override _read(): Teardown {
        return () => log.push("fine");
      }
    }
    const source = new Fine();
    const faulty = new Faulty();
    source.O("out").connect(faulty.I("in"));
    const flow = new Flow({ onError });
    flow.run(source);

    flow.dispose();

    expect(log).toEqual(["fine"]);
    expect(onError).toHaveBeenCalledWith(failure, faulty);
  });

  it("rethrows a failing teardown asynchronously when there is no onError", async () => {
    const failure = new Error("teardown failed");
    const rethrown = new Promise<unknown>((resolve) => {
      const original = globalThis.queueMicrotask;
      vi.spyOn(globalThis, "queueMicrotask").mockImplementationOnce((task) => {
        original(() => {
          try {
            task();
          } catch (error: unknown) {
            resolve(error);
          }
        });
      });
    });
    class Faulty extends ReadableNode {
      constructor() {
        super({});
        Port.O("out").attach(this);
      }

      override _read(): Teardown {
        return () => {
          throw failure;
        };
      }
    }
    const flow = new Flow();
    flow.run(new Faulty());

    expect(() => flow.dispose()).not.toThrow();
    await expect(rethrown).resolves.toBe(failure);
  });

  it("disposes every graph it ran", () => {
    const a = new Manual();
    const b = new Manual();
    const sinkA = new Collect();
    const sinkB = new Collect();
    a.O("out").connect(sinkA.I("in"));
    b.O("out").connect(sinkB.I("in"));
    const flow = new Flow();
    flow.run(a);
    flow.run(b);

    flow.dispose();
    a.emit(1);
    b.emit(1);

    expect([sinkA.seen, sinkB.seen]).toEqual([[], []]);
  });

  it("leaves nodes another flow started untouched", () => {
    const source = new Manual();
    const sink = new Collect();
    source.O("out").connect(sink.I("in"));
    const owner = new Flow();
    owner.run(source);
    const other = new Flow();
    other.run(source);

    other.dispose();
    source.emit(1);

    expect(sink.seen).toEqual([1]);
    owner.dispose();
  });
});
