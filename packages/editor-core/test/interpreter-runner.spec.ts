/**
 * End-to-end integration: author a graph via editor-core, then run it through
 * the real `InterpreterGraphRunner` (editor-core -> serialization -> interpreter
 * -> @hlang-org/runtime). Proves the whole authoring-to-execution seam.
 */

import * as runtime from '@hlang-org/runtime';
import { NodeRegistry as RuntimeNodeRegistry } from '@hlang-org/interpreter';
import type {
  IRuntimeFlow,
  INodeConstructionOptions,
  NodeConstructor,
} from '@hlang-org/interpreter';
import {
  createEditorCore,
  InterpreterGraphRunner,
  AddNodeCommand,
  ConnectCommand,
} from '../src';
import type { Endpoint } from '../src';
import { readableDescriptor, writableDescriptor } from './fixtures/descriptors';

interface RuntimePortLike {
  send(msg: unknown): void;
  receive(next: (msg: unknown) => void): unknown;
  attach(node: unknown): void;
}
interface RuntimeStatics {
  Port: { I(name: string): RuntimePortLike; O(name: string): RuntimePortLike };
  Flow: new (opts?: Record<string, unknown>) => IRuntimeFlow;
  ReadableNode: new (opts: unknown) => object;
  WriteableNode: new (opts: unknown) => object;
}
const rt = runtime as unknown as RuntimeStatics;

const out = (nodeId: string): Endpoint => ({ nodeId, portId: 'Output' });
const inp = (nodeId: string): Endpoint => ({ nodeId, portId: 'Input' });

describe('InterpreterGraphRunner (integration)', () => {
  it('runs an editor-authored R->W graph through the real runtime', () => {
    const received: unknown[] = [];

    // Real runtime node classes for this test.
    class Source extends rt.ReadableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        rt.Port.O('Output').attach(this);
      }
      _read(o: (name: string) => RuntimePortLike): void {
        o('Output').send('payload');
      }
    }
    class Sink extends rt.WriteableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        rt.Port.I('Input').attach(this);
      }
      _write(i: (name: string) => RuntimePortLike): void {
        i('Input').receive(p => received.push(p));
      }
    }

    const runtimeRegistry = new RuntimeNodeRegistry()
      .register('test-source', Source as unknown as NodeConstructor)
      .register('test-sink', Sink as unknown as NodeConstructor);

    const runner = new InterpreterGraphRunner(
      runtimeRegistry,
      () => new rt.Flow({}),
    );

    const core = createEditorCore({ graphRunner: runner });
    core.registry.register(readableDescriptor);
    core.registry.register(writableDescriptor);

    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const w = core.registry.createNode('test-sink', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(w));
    core.commands.execute(new ConnectCommand('e1', out(r.id), inp(w.id)));

    expect(core.execution).toBeDefined();
    const handle = core.execution?.run(core.model);
    handle?.dispose();

    expect(received).toEqual(['payload']);
  });
});
