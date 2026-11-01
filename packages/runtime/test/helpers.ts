/**
 * Small nodes the runtime specs compose into flows. Each is a plain subclass of
 * a public node kind, written the way a user of @hlang-org/runtime writes one.
 */
import { Port, ReadableNode, TransformNode, WriteableNode } from "../src/index";
import type { PortAccessor } from "../src/index";

/** Narrows a message to a number, as a node does with what it receives. */
export function asNumber(value: unknown): number {
  if (typeof value !== "number") {
    throw new TypeError(`expected a number, received ${typeof value}`);
  }
  return value;
}

/** A Readable that sends each of `values` on its `out` port when the flow starts. */
export class Values extends ReadableNode {
  reads = 0;

  constructor(private readonly values: readonly unknown[]) {
    super({});
    Port.O("out").attach(this);
  }

  override _read($o: PortAccessor) {
    this.reads += 1;
    this.values.forEach((value) => $o("out").send(value));
  }
}

/** A Transform that applies `map` to each value from `in` and sends it on `out`. */
export class Apply extends TransformNode {
  constructor(private readonly map: (value: unknown) => unknown) {
    super({});
    Port.I("in").attach(this);
    Port.O("out").attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor) {
    $i("in").receive((value: unknown) => $o("out").send(this.map(value)));
  }
}

/** A Writable that records every value arriving on each of its named inputs. */
export class Collect extends WriteableNode {
  readonly seen: unknown[] = [];
  readonly byPort: Record<string, unknown[]> = {};

  constructor(inputs: readonly string[] = ["in"]) {
    super({});
    inputs.forEach((name) => {
      this.byPort[name] = [];
      Port.I(name).attach(this);
    });
  }

  override _write($i: PortAccessor) {
    Object.keys(this.byPort).forEach((name) => {
      $i(name).receive((value: unknown) => {
        this.seen.push(value);
        this.byPort[name]?.push(value);
      });
    });
  }
}
