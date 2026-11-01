/**
 * The node kit of the Lumen editor on the home page: generic stream nodes and
 * nothing else. Each node is defined once, binding its design-time descriptor
 * (what the editor shows and validates) to its runtime class (what the
 * interpreter runs), so the two cannot drift.
 *
 * Adapted from the kit in examples/editor-react-playground, without its media
 * nodes, on the site's typed runtime boundary (../runtime).
 */

import { NodeRegistry } from '@hlang-org/interpreter';
import type { INodeConstructionOptions, NodeConstructor } from '@hlang-org/interpreter';
import type { NodeDescriptor, PortDescriptor } from '@hlang-org/editor-core';
import { interval, map, range, takeUntil, timer } from 'rxjs';
import { numberParam, runtime } from '@/lib/runtime';
import type { PortAccess } from '@/lib/runtime';

const DTO = { name: 'DTO', kind: 'interface' as const };
const ERROR_PORT: PortDescriptor = { id: '@node/error', direction: 'O', name: 'error', dataType: DTO, isError: true };
const input = (id: string): PortDescriptor => ({ id, direction: 'I', name: id, dataType: DTO, isError: false });
const output = (id: string): PortDescriptor => ({ id, direction: 'O', name: id, dataType: DTO, isError: false });

interface KitNode {
  readonly descriptor: NodeDescriptor;
  readonly ctor: NodeConstructor;
}

interface Definition {
  readonly code: string;
  readonly kind: NodeDescriptor['kind'];
  readonly displayName: string;
  readonly group: string;
  readonly defaultParams?: NodeDescriptor['defaultParams'];
  /** Named inputs of a T or W node; defaults to one `Input`. */
  readonly inputs?: readonly string[];
  readonly ctor: NodeConstructor;
}

/** Ports follow the kind: R has an output, T has inputs and an output, W has inputs only. */
function define(definition: Definition): KitNode {
  const inputs = (definition.inputs ?? ['Input']).map(input);
  const ports =
    definition.kind === 'R'
      ? [output('Output'), ERROR_PORT]
      : definition.kind === 'T'
        ? [...inputs, output('Output'), ERROR_PORT]
        : inputs;
  return {
    descriptor: {
      code: definition.code,
      kind: definition.kind,
      displayName: definition.displayName,
      group: definition.group,
      ports,
      defaultParams: definition.defaultParams ?? {},
      runtimeResource: `@hlang-org/website/lumen-kit/${definition.code}`,
    },
    ctor: definition.ctor,
  };
}

/** R: a count that goes up every `periodMs`, until the flow stops. */
class IntervalSource extends runtime.ReadableNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.O('Output').attach(this);
  }
  override _read($o: PortAccess): void {
    interval(numberParam(this.opts, 'periodMs', 700))
      .pipe(
        map(count => count + 1),
        takeUntil(this.opts.signal.observable),
      )
      .subscribe(count => {
        $o('Output').send(count);
      });
  }
}

/** R: `count` numbers from `start`, once. */
class RangeSource extends runtime.ReadableNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.O('Output').attach(this);
  }
  override _read($o: PortAccess): void {
    range(numberParam(this.opts, 'start', 1), numberParam(this.opts, 'count', 5))
      .pipe(takeUntil(this.opts.signal.observable))
      .subscribe(value => {
        $o('Output').send(value);
      });
  }
}

/** R: one value, once. */
class ConstantSource extends runtime.ReadableNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.O('Output').attach(this);
  }
  override _read($o: PortAccess): void {
    $o('Output').send(numberParam(this.opts, 'value', 42));
  }
}

/** T: multiplies numbers by `factor`; passes anything else through. */
class Scale extends runtime.TransformNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.I('Input').attach(this);
    runtime.Port.O('Output').attach(this);
  }
  override _transform($i: PortAccess, $o: PortAccess): void {
    const factor = numberParam(this.opts, 'factor', 2);
    $i('Input').receive(value => {
      $o('Output').send(typeof value === 'number' ? value * factor : value);
    });
  }
}

/** T: drops numbers below `min`. */
class Filter extends runtime.TransformNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.I('Input').attach(this);
    runtime.Port.O('Output').attach(this);
  }
  override _transform($i: PortAccess, $o: PortAccess): void {
    const min = numberParam(this.opts, 'min', 0);
    $i('Input').receive(value => {
      if (typeof value !== 'number' || value >= min) {
        $o('Output').send(value);
      }
    });
  }
}

/** T: the running total of the numbers received. */
class Sum extends runtime.TransformNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.I('Input').attach(this);
    runtime.Port.O('Output').attach(this);
  }
  override _transform($i: PortAccess, $o: PortAccess): void {
    let total = 0;
    $i('Input').receive(value => {
      if (typeof value === 'number') {
        total += value;
        $o('Output').send(total);
      }
    });
  }
}

/** T: forwards each value after `ms` milliseconds. */
class Delay extends runtime.TransformNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.I('Input').attach(this);
    runtime.Port.O('Output').attach(this);
  }
  override _transform($i: PortAccess, $o: PortAccess): void {
    const ms = numberParam(this.opts, 'ms', 300);
    $i('Input').receive(value => {
      timer(ms)
        .pipe(takeUntil(this.opts.signal.observable))
        .subscribe(() => {
          $o('Output').send(value);
        });
    });
  }
}

/** T: two named inputs, A and B, interleaved onto one output. */
class Merge extends runtime.TransformNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.I('A').attach(this);
    runtime.Port.I('B').attach(this);
    runtime.Port.O('Output').attach(this);
  }
  override _transform($i: PortAccess, $o: PortAccess): void {
    $i('A').receive(value => {
      $o('Output').send(value);
    });
    $i('B').receive(value => {
      $o('Output').send(value);
    });
  }
}

/** W: hands every value to the host. */
function consoleSink(report: (value: unknown) => void): NodeConstructor {
  return class ConsoleSink extends runtime.WriteableNode {
    constructor(options: INodeConstructionOptions) {
      super(options);
      runtime.Port.I('Input').attach(this);
    }
    override _write($i: PortAccess): void {
      $i('Input').receive(report);
    }
  };
}

/** The node types of the kit, in palette order. */
function kitNodes(report: (value: unknown) => void): readonly KitNode[] {
  return [
    define({ code: 'interval', kind: 'R', displayName: 'Interval', group: 'Sources', defaultParams: { periodMs: 700 }, ctor: IntervalSource }),
    define({ code: 'range', kind: 'R', displayName: 'Range', group: 'Sources', defaultParams: { start: 1, count: 5 }, ctor: RangeSource }),
    define({ code: 'constant', kind: 'R', displayName: 'Constant', group: 'Sources', defaultParams: { value: 42 }, ctor: ConstantSource }),
    define({ code: 'scale', kind: 'T', displayName: 'Scale', group: 'Transforms', defaultParams: { factor: 2 }, ctor: Scale }),
    define({ code: 'filter', kind: 'T', displayName: 'Filter', group: 'Transforms', defaultParams: { min: 0 }, ctor: Filter }),
    define({ code: 'sum', kind: 'T', displayName: 'Sum', group: 'Transforms', ctor: Sum }),
    define({ code: 'delay', kind: 'T', displayName: 'Delay', group: 'Transforms', defaultParams: { ms: 300 }, ctor: Delay }),
    define({ code: 'merge', kind: 'T', displayName: 'Merge', group: 'Transforms', inputs: ['A', 'B'], ctor: Merge }),
    define({ code: 'console', kind: 'W', displayName: 'Console', group: 'Sinks', ctor: consoleSink(report) }),
  ];
}

/** The design-time descriptors and the runtime registry, from one definition list. */
export function createLumenKit(report: (value: unknown) => void): {
  readonly descriptors: readonly NodeDescriptor[];
  readonly registry: NodeRegistry;
} {
  const nodes = kitNodes(report);
  const registry = new NodeRegistry();
  for (const node of nodes) {
    registry.register(node.descriptor.code, node.ctor);
  }
  return { descriptors: nodes.map(node => node.descriptor), registry };
}
