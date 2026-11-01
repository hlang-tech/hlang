/**
 * RFC 0001, part 1: bounded connections, suspending sends, one information
 * packet at a time, and asynchronous handlers.
 */
import { describe, expect, it, vi } from "vitest";
import { Flow, FlowDisposedError, Port, ReadableNode, TransformNode, WriteableNode } from "../src/index";
import type { DeliveryEvent, DroppedEvent, PortAccessor } from "../src/index";

/** A promise the test settles by hand. */
function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks run. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A Readable the test sends through by hand. */
class Source extends ReadableNode {
  out: Port | undefined;

  constructor() {
    super({});
    Port.O("out").attach(this);
  }

  override _read($o: PortAccessor) {
    this.out = $o("out");
  }

  port(): Port {
    if (this.out === undefined) {
      throw new Error("not started");
    }
    return this.out;
  }
}

/** A Writable whose handler works on each value until the test finishes it. */
class Slow extends WriteableNode {
  readonly started: unknown[] = [];
  readonly finished: unknown[] = [];
  readonly pending: { value: unknown; done: ReturnType<typeof deferred> }[] = [];
  inFlight = 0;
  maxInFlight = 0;

  constructor(private readonly options: { concurrency?: number } = {}) {
    super({});
    Port.I("in").attach(this);
  }

  override _write($i: PortAccessor) {
    $i("in").receive(
      async (value: unknown) => {
        this.started.push(value);
        this.inFlight += 1;
        this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
        const done = deferred();
        this.pending.push({ value, done });
        try {
          await done.promise;
        } finally {
          this.inFlight -= 1;
          this.finished.push(value);
        }
      },
      this.options.concurrency === undefined ? {} : { concurrency: this.options.concurrency },
    );
  }

  /** Finishes the oldest value still being worked on. */
  finishNext(): void {
    this.pending.shift()?.done.resolve();
  }
}

function bounded(capacity: number, overflow?: "drop-oldest", options: { concurrency?: number; flow?: ConstructorParameters<typeof Flow>[0] } = {}) {
  const source = new Source();
  const sink = new Slow(options.concurrency === undefined ? {} : { concurrency: options.concurrency });
  source.O("out").connect(sink.I("in"), overflow === undefined ? { capacity } : { capacity, overflow });
  const flow = new Flow(options.flow ?? {});
  flow.run(source);
  return { source, sink, flow, out: source.port() };
}

describe("bounded connections (RFC 0001)", () => {
  it("still accepts every send on an unbounded connection, and reports room", () => {
    const source = new Source();
    const sink = new Slow();
    source.O("out").connect(sink.I("in"));
    new Flow().run(source);
    expect([source.port().send(1), source.port().send(2)]).toEqual([true, true]);
    // Unbounded and no concurrency limit: asynchronous handlers overlap, as before.
    expect(sink.started).toEqual([1, 2]);
  });

  it("works on one packet at a time through a bounded connection", async () => {
    const { out, sink } = bounded(3);
    out.send("a");
    out.send("b");
    expect(sink.started).toEqual(["a"]);

    sink.finishNext();
    await settle();
    expect(sink.started).toEqual(["a", "b"]);
    expect(sink.finished).toEqual(["a"]);
  });

  it("reports a full connection from send, and counts the packet being worked on", () => {
    const { out } = bounded(2);
    expect(out.send(1)).toBe(true); // in work: 1 of 2
    expect(out.send(2)).toBe(false); // waiting: 2 of 2, full
    expect(out.send(3)).toBe(false); // accepted beyond capacity, still full
  });

  it("resolves ready() once the connection has room again", async () => {
    const { out, sink } = bounded(1);
    out.send(1);
    let ready = false;
    void out.ready().then(() => {
      ready = true;
    });
    await settle();
    expect(ready).toBe(false);

    sink.finishNext();
    await settle();
    expect(ready).toBe(true);
  });

  it("keeps a producer that writes to the pace of its consumer", async () => {
    const { out, sink } = bounded(2);
    let sent = 0;
    const producer = (async () => {
      for (let value = 1; value <= 6; value += 1) {
        await out.write(value);
        sent += 1;
      }
    })();
    await settle();
    expect(sent).toBe(2); // capacity reached: the third write waits

    for (let i = 0; i < 6; i += 1) {
      sink.finishNext();
      await settle();
    }
    await producer;
    expect(sink.finished).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sink.maxInFlight).toBe(1);
  });

  it("honours an explicit concurrency, bounded or not", async () => {
    const source = new Source();
    const sink = new Slow({ concurrency: 2 });
    source.O("out").connect(sink.I("in"));
    new Flow().run(source);
    for (const value of [1, 2, 3, 4]) {
      source.port().send(value);
    }
    expect(sink.started).toEqual([1, 2]);
    sink.finishNext();
    await settle();
    expect(sink.started).toEqual([1, 2, 3]);
  });

  it("drops the oldest waiting packet of a full drop-oldest connection, never one in work", () => {
    const dropped: DroppedEvent[] = [];
    const { out, sink } = bounded(1, "drop-oldest", { flow: { observer: { dropped: (event) => dropped.push(event) } } });
    out.send("a"); // in work
    out.send("b"); // waits beyond capacity: nothing waiting to drop
    out.send("c"); // drops b
    expect(dropped.map((event) => event.message)).toEqual(["b"]);
    sink.finishNext();
    return settle().then(() => {
      expect(sink.started).toEqual(["a", "c"]);
    });
  });

  it("waits for the slowest branch of a fan-out", async () => {
    const source = new Source();
    const fast = new Slow();
    const slow = new Slow();
    source.O("out").connect(fast.I("in"), { capacity: 1 });
    source.O("out").connect(slow.I("in"), { capacity: 1 });
    new Flow().run(source);
    const out = source.port();
    out.send(1);
    let ready = false;
    void out.ready().then(() => {
      ready = true;
    });

    fast.finishNext();
    await settle();
    expect(ready).toBe(false);
    slow.finishNext();
    await settle();
    expect(ready).toBe(true);
  });

  it("routes a rejected asynchronous handler as a failure, and frees its slot", async () => {
    const failure = new Error("async failure");
    const onError = vi.fn();
    const { out, sink } = bounded(1, undefined, { flow: { onError } });
    out.send(1);
    out.send(2);
    sink.pending.shift()?.done.reject(failure);
    await settle();
    expect(onError).toHaveBeenCalledWith(failure, sink);
    expect(sink.started).toEqual([1, 2]);
  });

  it("sends a Transform's rejected asynchronous handler to its error port", async () => {
    const failure = new Error("async failure");
    class AsyncStep extends TransformNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
        Port.O("out").attach(this);
      }

      override _transform($i: PortAccessor) {
        $i("in").receive(() => Promise.reject(failure));
      }
    }
    const source = new Source();
    const step = new AsyncStep();
    const errors: unknown[] = [];
    source.O("out").connect(step.I("in"));
    new Flow().run(source);
    step.E().receive((error: unknown) => errors.push(error));
    source.port().send(1);
    await settle();
    expect(errors).toEqual([failure]);
  });

  it("rejects pending ready() and write() on dispose, and drops what waits", async () => {
    const { out, sink, flow } = bounded(1);
    out.send(1);
    out.send(2);
    const ready = out.ready();
    const write = out.write(3);
    flow.dispose();
    await expect(ready).rejects.toBeInstanceOf(FlowDisposedError);
    await expect(write).rejects.toBeInstanceOf(FlowDisposedError);
    sink.finishNext();
    await settle();
    expect(sink.started).toEqual([1]);
  });

  it("times an asynchronous delivery until its handler settles", async () => {
    vi.useFakeTimers({ toFake: ["performance"] });
    try {
      const events: DeliveryEvent[] = [];
      const { out, sink } = bounded(1, undefined, { flow: { observer: { delivered: (event) => events.push(event) } } });
      out.send("x");
      expect(events).toEqual([]);
      vi.advanceTimersByTime(40);
      sink.finishNext();
      await vi.waitFor(() => {
        expect(events).toHaveLength(1);
      });
      expect(events[0]?.duration).toBeGreaterThanOrEqual(40);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a capacity that is not a positive integer", () => {
    const source = new Source();
    const sink = new Slow();
    expect(() => source.O("out").connect(sink.I("in"), { capacity: 0 })).toThrow("capacity must be a positive integer");
    expect(() => source.O("out").connect(sink.I("in"), { capacity: 1.5 })).toThrow("capacity must be a positive integer");
  });

  it("passes a synchronous handler's messages through its gate in order", () => {
    const source = new Source();
    const seen: unknown[] = [];
    class Sync extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor) {
        $i("in").receive((value: unknown) => {
          seen.push(value);
        });
      }
    }
    source.O("out").connect(new Sync().I("in"), { capacity: 1 });
    new Flow().run(source);
    const out = source.port();
    // A synchronous handler has finished before send returns: always room.
    expect([out.send(1), out.send(2), out.send(3)]).toEqual([true, true, true]);
    expect(seen).toEqual([1, 2, 3]);
  });

  it("drops the oldest waiting packet with no observer too", async () => {
    const { out, sink } = bounded(1, "drop-oldest");
    out.send("a");
    out.send("b");
    out.send("c");
    sink.finishNext();
    await settle();
    expect(sink.started).toEqual(["a", "c"]);
  });

  it("rejects ready() on a disposed flow", async () => {
    const { out, flow } = bounded(1);
    flow.dispose();
    await expect(out.ready()).rejects.toBeInstanceOf(FlowDisposedError);
  });

  it("rejects a concurrency that is not a positive integer or Infinity", () => {
    const port = Port.I("in");
    expect(() => port.receive(() => undefined, { concurrency: 0 })).toThrow("concurrency must be a positive integer or Infinity");
    expect(() => port.receive(() => undefined, { concurrency: Number.POSITIVE_INFINITY })).not.toThrow();
  });

  it("gates an input that asks for a concurrency after its connection was wired", async () => {
    const source = new Source();
    const late = new WriteableNode({});
    Port.I("in").attach(late);
    source.O("out").connect(late.I("in"));
    const flow = new Flow();
    flow.run(source);
    // Asked for only now, after run() wired the connection on the fast route.
    const started: unknown[] = [];
    const gates: (() => void)[] = [];
    late.I("in").receive(
      (value: unknown) =>
        new Promise<void>((resolve) => {
          started.push(value);
          gates.push(resolve);
        }),
      { concurrency: 1 },
    );
    source.port().send(1);
    source.port().send(2);
    expect(started).toEqual([1]);
    gates.shift()?.();
    await settle();
    expect(started).toEqual([1, 2]);
    flow.dispose();
  });

  it("stops listening for gating when disposed", () => {
    const source = new Source();
    const sink = new WriteableNode({});
    Port.I("in").attach(sink);
    source.O("out").connect(sink.I("in"));
    const flow = new Flow();
    flow.run(source);
    flow.dispose();
    // Gating the port after dispose re-wires nothing.
    expect(() => sink.I("in").receive(() => undefined, { concurrency: 1 })).not.toThrow();
    expect(source.port().send(1)).toBe(true);
  });

  it("keeps the lowest concurrency an input's receivers ask for", async () => {
    const { out, sink } = bounded(5, undefined, { concurrency: 3 });
    // A second receiver on the same port asks for less.
    sink.I("in").receive(() => undefined, { concurrency: 2 });
    for (const value of [1, 2, 3]) {
      out.send(value);
    }
    expect(sink.started).toEqual([1, 2]);
    sink.finishNext();
    await settle();
    expect(sink.started).toEqual([1, 2, 3]);
  });
});
