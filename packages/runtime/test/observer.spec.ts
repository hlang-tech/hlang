import { afterEach, describe, expect, it, vi } from "vitest";
import { Flow, Port, ReadableNode, WriteableNode } from "../src/index";
import type { DeliveryEvent, FailureEvent, PortAccessor } from "../src/index";
import { Apply, Collect, Values } from "./helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

/** What a test compares: who delivered what to whom. */
function route(event: DeliveryEvent): string {
  return `${event.sourcePort}->${event.targetPort}:${String(event.message)}`;
}

function chain(values: readonly unknown[], map: (value: unknown) => unknown = (value) => value) {
  const source = new Values(values);
  const step = new Apply(map);
  const sink = new Collect();
  source.O("out").connect(step.I("in"));
  step.O("out").connect(sink.I("in"));
  return { source, step, sink };
}

describe("FlowOptions.observer", () => {
  it("sees every delivery, in delivery order, with its nodes and ports", () => {
    const events: DeliveryEvent[] = [];
    const { source, step, sink } = chain([1, 2], (value) => Number(value) * 10);
    new Flow({ observer: { delivered: (event) => events.push(event) } }).run(source);

    expect(events.map(route)).toEqual(["out->in:1", "out->in:10", "out->in:2", "out->in:20"]);
    expect(events.map((event) => [event.source, event.target])).toEqual([
      [source, step],
      [step, sink],
      [source, step],
      [step, sink],
    ]);
  });

  it("times each delivery as the receiving node's own work", () => {
    const clock = [100, 107, 200, 203];
    vi.spyOn(performance, "now").mockImplementation(() => clock.shift() ?? 0);
    const durations: number[] = [];
    const { source } = chain(["a"]);
    new Flow({ observer: { delivered: (event) => durations.push(event.duration) } }).run(source);

    // The step's send is queued, not nested, so its delivery is timed on its own.
    expect(durations).toEqual([7, 3]);
  });

  it("costs nothing without an observer: no clock is read", () => {
    const now = vi.spyOn(performance, "now");
    const { source, sink } = chain([1, 2, 3]);
    new Flow().run(source);
    expect(sink.seen).toEqual([1, 2, 3]);
    expect(now).not.toHaveBeenCalled();
  });

  it("sees every handler failure, wherever the failure is routed", () => {
    const failures: FailureEvent[] = [];
    const onError = vi.fn();
    const transformFailure = new Error("step failed");
    const writeFailure = new Error("sink failed");
    const source = new Values([1]);
    const step = new Apply(() => {
      throw transformFailure;
    });
    const errors = new Collect();
    source.O("out").connect(step.I("in"));
    step.O("@node/error").connect(errors.I("in"));
    class Faulty extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor) {
        $i("in").receive(() => {
          throw writeFailure;
        });
      }
    }
    const faulty = new Faulty();
    source.O("out").connect(faulty.I("in"));

    new Flow({ onError, observer: { failed: (event) => failures.push(event) } }).run(source);

    expect(failures).toEqual([
      { node: step, port: "in", error: transformFailure },
      { node: faulty, port: "in", error: writeFailure },
    ]);
    // Routing is unchanged: the Transform's error went to its error port,
    // the Writable's to onError.
    expect(errors.seen).toEqual([transformFailure]);
    expect(onError).toHaveBeenCalledWith(writeFailure, faulty);
  });

  it("reports an observer that throws to onError and keeps delivering", () => {
    const failure = new Error("observer failed");
    const onError = vi.fn();
    const { source, sink } = chain([1, 2]);
    new Flow({
      onError,
      observer: {
        delivered: () => {
          throw failure;
        },
      },
    }).run(source);

    expect(sink.seen).toEqual([1, 2]);
    expect(onError).toHaveBeenCalledTimes(4);
    expect(onError).toHaveBeenCalledWith(failure, null);
  });

  it("does not report a delivery that disposed the flow", () => {
    const events: DeliveryEvent[] = [];
    const flow = new Flow({ observer: { delivered: (event) => events.push(event) } });
    class StopAtTwo extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor) {
        $i("in").receive((value: unknown) => {
          if (value === 2) {
            flow.dispose();
          }
        });
      }
    }
    const source = new Values([1, 2, 3]);
    source.O("out").connect(new StopAtTwo().I("in"));
    flow.run(source);

    expect(events.map(route)).toEqual(["out->in:1"]);
  });

  it("sees nothing once the flow is disposed", () => {
    const events: DeliveryEvent[] = [];
    let out: Port | undefined;
    class Manual extends ReadableNode {
      constructor() {
        super({});
        Port.O("out").attach(this);
      }

      override _read($o: PortAccessor) {
        out = $o("out");
      }
    }
    const source = new Manual();
    source.O("out").connect(new Collect().I("in"));
    const flow = new Flow({ observer: { delivered: (event) => events.push(event) } });
    flow.run(source);

    out?.send(1);
    flow.dispose();
    out?.send(2);

    expect(events.map(route)).toEqual(["out->in:1"]);
  });
});
