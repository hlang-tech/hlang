/**
 * Execution seam: the core drives a runner with a serialized IGraph, fully
 * headless. This test injects a fake runner and never imports React, RxJS, or
 * @xyflow — proving the core stays framework-agnostic.
 */

import {
  ServiceCollection,
  InstantiationService,
  GraphModel,
  SerializationService,
  ExecutionService,
  IGraphModel,
  IGraphRunner,
} from '../src';
import { ISerializationService } from '../src';
import type {
  EditorNode,
  IExecutionHandle,
  IGraphRunnerType,
} from '../src';
import type { IGraph, INodeErrorEvent } from '@hlang-org/interpreter';

function rNode(id: string): EditorNode {
  return {
    id,
    code: 'test-source',
    kind: 'R',
    name: 'Source',
    position: { x: 0, y: 0 },
    params: {},
    ports: [{ id: 'Output', direction: 'O', name: 'Output', dataType: { name: 'DTO', kind: 'unknown' }, isError: false }],
  };
}

/** Fake runner: records the graph it was handed, emits no real streams. */
class FakeGraphRunner implements IGraphRunnerType {
  lastGraph?: IGraph;
  run(graph: IGraph): IExecutionHandle {
    this.lastGraph = graph;
    return {
      onError: (_listener: (event: INodeErrorEvent) => void) => ({ dispose: () => undefined }),
      onActivity: () => ({ dispose: () => undefined }),
      dispose: () => undefined,
    };
  }
}

describe('ExecutionService (headless seam)', () => {
  it('case 9: serializes the model and hands an IGraph with the right R count to the runner', () => {
    const services = new ServiceCollection();
    const instantiation = new InstantiationService(services);

    const model = new GraphModel();
    model.addNode(rNode('r1'));
    model.addNode(rNode('r2'));
    services.set(IGraphModel, model);
    services.set(ISerializationService, new SerializationService());

    const runner = new FakeGraphRunner();
    services.set(IGraphRunner, runner);

    const execution = instantiation.createInstance(ExecutionService);
    execution.run(model);

    expect(runner.lastGraph).toBeDefined();
    const readableCount = runner.lastGraph?.nodeList.filter(n => n.type === 'R').length;
    expect(readableCount).toBe(2);
  });
});
