/**
 * `IExecutionService` — the single seam between the headless model and a
 * running hlang flow. It serializes the model to `IGraph` and hands it to an
 * injected runner (the interpreter in production, a fake in tests), surfacing
 * node errors as editor-level callbacks. RxJS never crosses this boundary into
 * the core's public surface.
 */

import type {
  IGraph,
  INodeErrorEvent,
  INodeActivityEvent,
  INodeDeliveryEvent,
  INodeDroppedEvent,
  INodeEndedEvent,
  INodeFinishedEvent,
} from '@hlang-org/interpreter';
import { createDecorator } from '../di';
import type { IDisposable, IGraphModel } from './interfaces';
import { ISerializationService } from './serialization-interface';

/** A handle to a running execution. */
export interface IExecutionHandle extends IDisposable {
  onError(listener: (event: INodeErrorEvent) => void): IDisposable;
  /** Subscribe to node output-port emissions — the "living stream" signal. */
  onActivity(listener: (event: INodeActivityEvent) => void): IDisposable;
  /**
   * Subscribe to every message delivered on a connection, with how long the
   * receiving node took, when the runner traces the run. A runner that cannot
   * trace leaves it out.
   */
  onDelivery?(listener: (event: INodeDeliveryEvent) => void): IDisposable;
  /** Each input that ends, when the runner traces the run (RFC 0001). */
  onEnded?(listener: (event: INodeEndedEvent) => void): IDisposable;
  /** Each node that finishes, when the runner traces the run (RFC 0001). */
  onFinished?(listener: (event: INodeFinishedEvent) => void): IDisposable;
  /** Each message a full `drop-oldest` connection drops, when the runner traces the run. */
  onDropped?(listener: (event: INodeDroppedEvent) => void): IDisposable;
}

/**
 * Runs an `IGraph`. Abstracts `@hlang-org/interpreter.interpret` so the core
 * does not construct runtime objects directly and tests can inject a fake.
 */
export interface IGraphRunner {
  run(graph: IGraph): IExecutionHandle;
}
export const IGraphRunner = createDecorator<IGraphRunner>('graphRunner');

export interface IExecutionService {
  /** Serialize the current model and run it. */
  run(model: IGraphModel): IExecutionHandle;
}
export const IExecutionService = createDecorator<IExecutionService>('executionService');

export class ExecutionService implements IExecutionService {
  constructor(
    @ISerializationService private readonly serialization: ISerializationService,
    @IGraphRunner private readonly runner: IGraphRunner,
  ) {}

  run(model: IGraphModel): IExecutionHandle {
    const graph = this.serialization.toIGraph(model);
    return this.runner.run(graph);
  }
}
