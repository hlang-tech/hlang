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
}

export class InterpreterGraphRunner implements IGraphRunner {
  private readonly trace: boolean;

  constructor(
    private readonly registry: IRuntimeNodeRegistry,
    private readonly createFlow: FlowFactory,
    options: InterpreterGraphRunnerOptions = {},
  ) {
    this.trace = options.trace ?? true;
  }

  run(graph: IGraph): IExecutionHandle {
    const handle = interpret(
      graph,
      { registry: this.registry, createFlow: this.createFlow },
      { trace: this.trace },
    );
    return {
      onError: listener => handle.onError(listener),
      onActivity: listener => handle.onActivity(listener),
      onDelivery: listener => handle.onDelivery(listener),
      dispose: () => {
        handle.dispose();
      },
    };
  }
}
