/**
 * Test node fixtures built on the REAL `@hlang-org/runtime`.
 *
 * These exercise the genuine engine (RxJS ports, `flow.run`, W->T->R ordering)
 * rather than a mock, so the interpreter is verified against the true runtime
 * semantics. Each node kind is constructed from the interpreter's options, so
 * the registry takes the fixture classes as they are.
 */

import {
  Flow as RuntimeFlow,
  Port as RuntimePort,
  ReadableNode as RuntimeReadableNode,
  TransformNode as RuntimeTransformNode,
  WriteableNode as RuntimeWriteableNode,
} from '@hlang-org/runtime';
import type { PortAccessor, Teardown } from '@hlang-org/runtime';
import { interval, takeUntil } from 'rxjs';
import type {
  INodeConstructionOptions,
  NodeConstructor,
} from '../../src/runtime-contract';

export const Port = RuntimePort;
export const Flow = RuntimeFlow;
export const ReadableNode = RuntimeReadableNode<INodeConstructionOptions>;
export const TransformNode = RuntimeTransformNode<INodeConstructionOptions>;
export const WriteableNode = RuntimeWriteableNode<INodeConstructionOptions>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A one-shot R node that emits `opts.config.params.value` on "Output". */
export class ValueSourceNode extends ReadableNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.O('Output').attach(this);
  }
  override _read(o: PortAccessor): void {
    const params = this.opts.config.params;
    o('Output').send(isRecord(params) ? (params.value ?? null) : null);
  }
}

/**
 * A streaming R node that ignores the stop signal and returns a runtime
 * teardown instead, so only the flow's own disposal can stop it.
 */
export function makeTeardownSource(emitted: number[], periodMs: number): NodeConstructor {
  class TeardownSourceNode extends ReadableNode {
    constructor(opts: INodeConstructionOptions) {
      super(opts);
      Port.O('Output').attach(this);
    }
    override _read(o: PortAccessor): Teardown {
      let n = 0;
      const timer = setInterval(() => {
        n += 1;
        emitted.push(n);
        o('Output').send(n);
      }, periodMs);
      return () => {
        clearInterval(timer);
      };
    }
  }
  return TeardownSourceNode;
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
    override _read(o: PortAccessor): void {
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
  return StreamingSourceNode;
}

/** A T node that wraps each payload: `{ seen: payload }`. */
export class WrapTransformNode extends TransformNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    Port.I('Input').attach(this);
    Port.O('Output').attach(this);
  }
  override _transform(
    i: PortAccessor,
    o: PortAccessor,
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
  override _transform(
    i: PortAccessor,
    _o: PortAccessor,
  ): void {
    i('Input').receive(() => {
      this.throw(new Error('boom'));
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
  override _transform(
    i: PortAccessor,
    o: PortAccessor,
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
    override _write(i: PortAccessor): void {
      i('Input').receive((payload: unknown) => {
        collector.push(payload);
      });
    }
  }
  return CollectorSinkNode;
}

/** A W sink with two named inputs, `Left` and `Right`, recording each separately. */
export function makePairSink(collector: { Left: unknown[]; Right: unknown[] }): NodeConstructor {
  class PairSinkNode extends WriteableNode {
    constructor(opts: INodeConstructionOptions) {
      super(opts);
      Port.I('Left').attach(this);
      Port.I('Right').attach(this);
    }
    override _write(i: PortAccessor): void {
      i('Left').receive((payload: unknown) => {
        collector.Left.push(payload);
      });
      i('Right').receive((payload: unknown) => {
        collector.Right.push(payload);
      });
    }
  }
  return PairSinkNode;
}
