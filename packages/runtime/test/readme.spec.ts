/**
 * The TypeScript example in the README, compiled under this package's strict
 * settings and run, so the documentation stays true.
 */
import { describe, expect, it, vi } from "vitest";
import { Flow, Port, ReadableNode, TransformNode, WriteableNode } from "../src/index";
import type { PortAccessor, Teardown } from "../src/index";

interface ScaleOptions {
  readonly factor: number;
}

class Scale extends TransformNode<ScaleOptions> {
  constructor(opts: ScaleOptions) {
    super(opts);
    Port.I("in").attach(this);
    Port.O("out").attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor): void {
    $i("in").receive((value) => {
      if (typeof value === "number") {
        $o("out").send(value * this.opts.factor);
      }
    });
  }
}

describe("README", () => {
  it("runs the Scale example", () => {
    class Numbers extends ReadableNode {
      constructor() {
        super({});
        Port.O("out").attach(this);
      }

      override _read($o: PortAccessor): void {
        [1, "two", 3].forEach((value) => $o("out").send(value));
      }
    }
    const seen: unknown[] = [];
    class Log extends WriteableNode {
      constructor() {
        super({});
        Port.I("in").attach(this);
      }

      override _write($i: PortAccessor): void {
        $i("in").receive((value) => seen.push(value));
      }
    }
    const numbers = new Numbers();
    const scale = new Scale({ factor: 10 });
    const log = new Log();
    numbers.O("out").connect(scale.I("in"));
    scale.O("out").connect(log.I("in"));

    new Flow().run(numbers);

    expect(scale.opts.factor).toBe(10);
    expect(seen).toEqual([10, 30]);
  });

  it("stops the Ticker example with dispose", () => {
    vi.useFakeTimers();
    try {
      class Ticker extends ReadableNode {
        constructor() {
          super({});
          Port.O("tick").attach(this);
        }

        override _read($o: PortAccessor): Teardown {
          const timer = setInterval(() => $o("tick").send(Date.now()), 1000);
          return () => clearInterval(timer);
        }
      }
      const seen: unknown[] = [];
      class Log extends WriteableNode {
        constructor() {
          super({});
          Port.I("in").attach(this);
        }

        override _write($i: PortAccessor): void {
          $i("in").receive((value) => seen.push(value));
        }
      }
      const ticker = new Ticker();
      ticker.O("tick").connect(new Log().I("in"));

      const flow = new Flow();
      flow.run(ticker);
      vi.advanceTimersByTime(3000);
      flow.dispose();

      expect(seen).toHaveLength(3);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
