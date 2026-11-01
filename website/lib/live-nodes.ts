/**
 * The node classes behind the live graph on the home page. They are ordinary
 * @hlang-org/runtime nodes; the page runs them with @hlang-org/interpreter.
 *
 * Node classes are written against the typed runtime in ./runtime.
 */

import type { INodeConstructionOptions, NodeConstructor } from '@hlang-org/interpreter';
import { isObservable } from 'rxjs';
import type { Observable } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import type { TransformCode } from './live-graph';
import { runtime } from './runtime';
import type { PortAccess } from './runtime';

export const Flow = runtime.Flow;

/** Services the page passes to every node as `middleware`. */
export interface LiveMiddleware {
  /** The text the visitor types. */
  readonly input$: Observable<string>;
  /** Called by the sink with every value it receives. */
  readonly emit: (value: string) => void;
}

function middlewareOf(options: INodeConstructionOptions): LiveMiddleware {
  const { input$, emit } = options.middleware;
  if (!isObservable(input$) || typeof emit !== 'function') {
    throw new Error('live graph: middleware must provide input$ and emit');
  }
  return {
    input$: input$.pipe(map(value => String(value))),
    emit: (value: string) => {
      Reflect.apply(emit, undefined, [value]);
    },
  };
}

/** R: emits every value of the visitor's input on `out` until the flow stops. */
class TextSource extends runtime.ReadableNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.O('out').attach(this);
  }
  override _read($o: PortAccess): void {
    middlewareOf(this.opts)
      .input$.pipe(takeUntil(this.opts.signal.observable))
      .subscribe(text => {
        $o('out').send(text);
      });
  }
}

/** T: maps every received string with `map` and sends the result on `out`. */
function transform(map: (text: string) => string): NodeConstructor {
  return class Transform extends runtime.TransformNode {
    constructor(options: INodeConstructionOptions) {
      super(options);
      runtime.Port.I('in').attach(this);
      runtime.Port.O('out').attach(this);
    }
    override _transform($i: PortAccess, $o: PortAccess): void {
      $i('in').receive(message => {
        $o('out').send(map(String(message)));
      });
    }
  };
}

/** W: hands every received value to the page. */
class Print extends runtime.WriteableNode {
  constructor(options: INodeConstructionOptions) {
    super(options);
    runtime.Port.I('in').attach(this);
  }
  override _write($i: PortAccess): void {
    const { emit } = middlewareOf(this.opts);
    $i('in').receive(message => {
      emit(String(message));
    });
  }
}

/** User-perceived characters, so an emoji or a combined accent counts as one. */
function graphemes(text: string): string[] {
  return Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text), part => part.segment);
}

/** The pure text functions; the page also uses them to render the output without script. */
export const TRANSFORM_FUNCTIONS: Readonly<Record<TransformCode, (text: string) => string>> = {
  uppercase: text => text.toUpperCase(),
  reverse: text => graphemes(text).reverse().join(''),
  length: text => `${String(graphemes(text).length)} characters`,
};

export const TRANSFORM_LABELS: Readonly<Record<TransformCode, string>> = {
  uppercase: 'Uppercase',
  reverse: 'Reverse',
  length: 'Length',
};

export const TRANSFORM_NODES: Readonly<Record<TransformCode, NodeConstructor>> = {
  uppercase: transform(TRANSFORM_FUNCTIONS.uppercase),
  reverse: transform(TRANSFORM_FUNCTIONS.reverse),
  length: transform(TRANSFORM_FUNCTIONS.length),
};

export const NODES: { readonly source: NodeConstructor; readonly print: NodeConstructor } = {
  source: TextSource,
  print: Print,
};
