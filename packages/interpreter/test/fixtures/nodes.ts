/**
 * Test node fixtures built on the REAL `@hlang-org/runtime`.
 *
 * These exercise the genuine engine (RxJS ports, `flow.run`, W->T->R ordering)
 * rather than a mock, so the interpreter is verified against the true runtime
 * semantics. The runtime ships loose `any` declarations; we adapt them through
 * a single typed boundary here (`asNodeConstructor`) so the test bodies stay
 * strictly typed.
 */

import * as runtime from '@hlang-org/runtime';
import { interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type {
  INodeConstructionOptions,
  NodeConstructor,
} from '../../src/runtime-contract';

// The runtime's compiled types are permissive; describe the slice we use.
interface RuntimePortLike {
  send(msg: unknown): void;
  receive(next: (msg: unknown) => void): unknown;
  connect(port: RuntimePortLike): RuntimePortLike;
  attach(node: unknown): void;
}
interface RuntimeNodeLike {
  readonly id: string;
  readonly type: symbol;
  I(name: string): RuntimePortLike;
  O(name: string): RuntimePortLike;
  E(): RuntimePortLike;
  throw(error: unknown): void;
}
interface RuntimeStatics {
  Port: {
    I(name: string): RuntimePortLike;
    O(name: string): RuntimePortLike;
  };
  Flow: new (opts?: Record<string, unknown>) => { run(root: unknown): void };
  ReadableNode: new (opts: unknown) => RuntimeNodeLike;
  TransformNode: new (opts: unknown) => RuntimeNodeLike;
  WriteableNode: new (opts: unknown) => RuntimeNodeLike;
}

const rt = runtime as unknown as RuntimeStatics;

export const Port = rt.Port;
export const Flow = rt.Flow;
export const ReadableNode = rt.ReadableNode;
export const TransformNode = rt.TransformNode;
export const WriteableNode = rt.WriteableNode;

/** Adapt a runtime node class to our strict `NodeConstructor` boundary type. */
export function asNodeConstructor(
  ctor: new (opts: INodeConstructionOptions) => RuntimeNodeLike,
): NodeConstructor {
  return ctor as unknown as NodeConstructor;
}

/** A one-shot R node that emits `opts.config.params.value` on "Output". */
export class ValueSourceNode extends ReadableNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.O('Output').attach(this);
  }
  _read(o: (name: string) => RuntimePortLike): void {
    const opts = this as unknown as { opts: { config?: { params?: { value?: unknown } } } };
    const value = opts.opts.config?.params?.value ?? null;
    o('Output').send(value);
  }
}

/**
 * A streaming R node that emits an incrementing tick on an interval, bound to
 * the flow's stop signal via `takeUntil` — so `handle.dispose()` actually stops
 * it (no leaked interval). Records each emission into the injected `emitted`
 * array so a test can assert emission stops after dispose.
 */
export function makeStreamingSource(
  emitted: number[],
  periodMs: number,
): NodeConstructor {
  class StreamingSourceNode extends ReadableNode {
    private readonly stop: INodeConstructionOptions['signal'];
    constructor(opts: INodeConstructionOptions) {
      super(opts);
      this.stop = opts.signal;
      Port.O('Output').attach(this);
    }
    _read(o: (name: string) => RuntimePortLike): void {
      let n = 0;
      interval(periodMs)
        .pipe(takeUntil(this.stop.observable))
        .subscribe(() => {
          n += 1;
          emitted.push(n);
          o('Output').send(n);
        });
    }
  }
  return asNodeConstructor(StreamingSourceNode);
}

/** A T node that wraps each payload: `{ seen: payload }`. */
export class WrapTransformNode extends TransformNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('Input').attach(this);
    Port.O('Output').attach(this);
  }
  _transform(
    i: (name: string) => RuntimePortLike,
    o: (name: string) => RuntimePortLike,
  ): void {
    i('Input').receive((payload: unknown) => {
      o('Output').send({ seen: payload });
    });
  }
}

/** A T node that always throws on its `@node/error` port when it receives. */
export class ThrowingTransformNode extends TransformNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('Input').attach(this);
    Port.O('Output').attach(this);
  }
  _transform(
    i: (name: string) => RuntimePortLike,
    _o: (name: string) => RuntimePortLike,
  ): void {
    i('Input').receive(() => {
      (this as unknown as RuntimeNodeLike).throw(new Error('boom'));
    });
  }
}

/**
 * A T node for building T<->T feedback loops. It forwards each payload to its
 * output but stops after a bounded number of emissions, so a feedback edge
 * converges instead of cascading forever. Real feedback nodes bound themselves
 * with RxJS operators (`take`, `scan` + guard); this fixture models that with
 * a simple counter to keep the test deterministic and free of infinite loops.
 */
export class EchoTransformNode extends TransformNode {
  private static readonly MAX_FORWARDS = 3;
  private forwards = 0;

  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('Input').attach(this);
    Port.O('Output').attach(this);
  }
  _transform(
    i: (name: string) => RuntimePortLike,
    o: (name: string) => RuntimePortLike,
  ): void {
    i('Input').receive((payload: unknown) => {
      if (this.forwards >= EchoTransformNode.MAX_FORWARDS) {
        return;
      }
      this.forwards += 1;
      o('Output').send(payload);
    });
  }
}

/** A W sink that records everything it receives into `collector`. */
export function makeCollectorSink(collector: unknown[]): NodeConstructor {
  class CollectorSinkNode extends WriteableNode {
    constructor(opts: INodeConstructionOptions) {
      super(opts);
      Port.I('Input').attach(this);
    }
    _write(i: (name: string) => RuntimePortLike): void {
      i('Input').receive((payload: unknown) => {
        collector.push(payload);
      });
    }
  }
  return asNodeConstructor(CollectorSinkNode);
}

/** A W sink with two named inputs, `Left` and `Right`, recording each separately. */
export function makePairSink(collector: { Left: unknown[]; Right: unknown[] }): NodeConstructor {
  class PairSinkNode extends WriteableNode {
    constructor(opts: INodeConstructionOptions) {
      super(opts);
      Port.I('Left').attach(this);
      Port.I('Right').attach(this);
    }
    _write(i: (name: string) => RuntimePortLike): void {
      i('Left').receive((payload: unknown) => {
        collector.Left.push(payload);
      });
      i('Right').receive((payload: unknown) => {
        collector.Right.push(payload);
      });
    }
  }
  return asNodeConstructor(PairSinkNode);
}
