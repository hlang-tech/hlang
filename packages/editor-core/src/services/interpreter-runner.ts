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

export class InterpreterGraphRunner implements IGraphRunner {
  constructor(
    private readonly registry: IRuntimeNodeRegistry,
    private readonly createFlow: FlowFactory,
  ) {}

  run(graph: IGraph): IExecutionHandle {
    const handle = interpret(graph, {
      registry: this.registry,
      createFlow: this.createFlow,
    });
    return {
      onError: listener => handle.onError(listener),
      onActivity: listener => handle.onActivity(listener),
      dispose: () => {
        handle.dispose();
      },
    };
  }
}
