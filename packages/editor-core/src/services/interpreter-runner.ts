/**
 * `InterpreterGraphRunner` — production `IGraphRunner` backed by
 * `@hlang-org/interpreter`. The runtime node registry and flow factory are
 * supplied by the assembling host application, so editor-core never
 * hard-codes concrete node classes or touches RxJS itself.
 */

import { interpret } from '@hlang-org/interpreter';
import type {
  IGraph,
  INodeRegistry as IRuntimeNodeRegistry,
  FlowFactory,
  IRuntimeSliceOptions,
} from '@hlang-org/interpreter';
import type { IExecutionHandle, IGraphRunner } from './execution-service';

/** How an `InterpreterGraphRunner` runs graphs. */
export interface InterpreterGraphRunnerOptions {
  /**
   * Trace every run, so the handle reports each delivery and its timing
   * through `onDelivery`. Default `true`: the editor is where graphs are
   * inspected. Turn it off where a run must not read a clock per message.
   */
  readonly trace?: boolean;
  /**
   * How a run shares the thread. Default `{}`: deliveries run in slices
   * (5 ms by default) with the rest of the page in between, so a graph that
   * loops forever with no asynchronous step (feedback between transforms is
   * legal) cannot freeze the editor, and Stop can end it. `false` delivers
   * synchronously, which is fastest.
   */
  readonly slice?: IRuntimeSliceOptions | false;
  /**
   * Deep-freeze messages as they are sent (RFC 0001). Default `true`: a node
   * that mutates what it received fails at once in the editor, where graphs
   * are built, instead of corrupting another branch's data. `false` skips
   * the walk of each message.
   */
  readonly freezeMessages?: boolean;
}

export class InterpreterGraphRunner implements IGraphRunner {
  private readonly trace: boolean;
  private readonly slice: IRuntimeSliceOptions | undefined;
  private readonly freezeMessages: boolean;

  constructor(
    private readonly registry: IRuntimeNodeRegistry,
    private readonly createFlow: FlowFactory,
    options: InterpreterGraphRunnerOptions = {},
  ) {
    this.trace = options.trace ?? true;
    this.slice = options.slice === false ? undefined : (options.slice ?? {});
    this.freezeMessages = options.freezeMessages ?? true;
  }

  run(graph: IGraph): IExecutionHandle {
    const handle = interpret(
      graph,
      { registry: this.registry, createFlow: this.createFlow },
      {
        trace: this.trace,
        freezeMessages: this.freezeMessages,
        ...(this.slice === undefined ? {} : { slice: this.slice }),
      },
    );
    return {
      onError: listener => handle.onError(listener),
      onActivity: listener => handle.onActivity(listener),
      onDelivery: listener => handle.onDelivery(listener),
      onEnded: listener => handle.onEnded(listener),
      onFinished: listener => handle.onFinished(listener),
      onDropped: listener => handle.onDropped(listener),
      dispose: () => {
        handle.dispose();
      },
    };
  }
}
