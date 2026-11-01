/**
 * RFC 0001, part 5: messages are immutable values. With `freezeMessages`,
 * plain data is deep-frozen as it is sent, so a node that mutates what it
 * received fails at once, as its own failure.
 */
import { describe, expect, it } from "vitest";
import { Flow, Port, ReadableNode, TransformNode } from "../src/index";
import type { PortAccessor } from "../src/index";
import { Collect } from "./helpers";

/** A Readable that sends one message the test provides. */
class One extends ReadableNode {
  constructor(private readonly message: unknown) {
    super({});
    Port.O("out").attach(this);
  }

  override _read($o: PortAccessor) {
    $o("out").send(this.message);
  }
}

function isCounter(value: unknown): value is { count: number } {
  return typeof value === "object" && value !== null && "count" in value;
}

/** A Transform that mutates what it receives: breaks the contract. */
class Mutates extends TransformNode {
  constructor() {
    super({});
    Port.I("in").attach(this);
    Port.O("out").attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor) {
    $i("in").receive((value: unknown) => {
      if (isCounter(value)) {
        value.count = 99;
      }
      $o("out").send(value);
    });
  }
}

function fanOut(message: unknown, freezeMessages: boolean) {
  const source = new One(message);
  const mutates = new Mutates();
  const errors = new Collect();
  const other = new Collect();
  source.O("out").connect(mutates.I("in"));
  source.O("out").connect(other.I("in"));
  mutates.E().connect(errors.I("in"));
  new Flow({ freezeMessages }).run(source);
  return { errors, other };
}

describe("FlowOptions.freezeMessages (RFC 0001)", () => {
  it("fails the node that mutates a message, and keeps the other branch's copy intact", () => {
    const { errors, other } = fanOut({ count: 1 }, true);
    expect(errors.seen).toHaveLength(1);
    expect(errors.seen[0]).toBeInstanceOf(TypeError);
    expect(other.seen).toEqual([{ count: 1 }]);
  });

  it("leaves messages mutable without it, as before", () => {
    const { errors } = fanOut({ count: 1 }, false);
    expect(errors.seen).toEqual([]);
  });

  it("freezes nested plain objects and arrays, and survives cycles", () => {
    const item = { a: 1 };
    const list = [item];
    const deep = { b: 2 };
    const message: Record<string, unknown> = { list, nested: { deep } };
    message.self = message;
    new Flow({ freezeMessages: true }).run(new One(message));
    expect([message, list, item, deep].map((value) => Object.isFrozen(value))).toEqual([true, true, true, true]);
  });

  it("leaves typed arrays, class instances, maps and sets alone", () => {
    class Frame {
      width = 1;
    }
    const bytes = new Uint8Array([1, 2]);
    const frame = new Frame();
    const map = new Map([["k", 1]]);
    new Flow({ freezeMessages: true }).run(new One({ bytes, frame, map }));
    expect([Object.isFrozen(bytes), Object.isFrozen(frame), Object.isFrozen(map)]).toEqual([false, false, false]);
  });

  it("passes primitives through untouched", () => {
    const sink = new Collect();
    const source = new One("text");
    source.O("out").connect(sink.I("in"));
    new Flow({ freezeMessages: true }).run(source);
    expect(sink.seen).toEqual(["text"]);
  });
});
