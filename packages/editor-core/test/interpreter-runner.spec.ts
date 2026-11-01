/**
 * End-to-end integration: author a graph via editor-core, then run it through
 * the real `InterpreterGraphRunner` (editor-core -> serialization -> interpreter
 * -> @hlang-org/runtime). Proves the whole authoring-to-execution seam.
 */

import { describe, it, expect } from 'vitest';
import { Flow, Port, ReadableNode, WriteableNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import { NodeRegistry as RuntimeNodeRegistry } from '@hlang-org/interpreter';
import type { INodeConstructionOptions, INodeDeliveryEvent, IRuntimeFlowOptions } from '@hlang-org/interpreter';
import {
  createEditorCore,
  InterpreterGraphRunner,
  AddNodeCommand,
  ConnectCommand,
} from '../src';
import type { Endpoint } from '../src';
import { readableDescriptor, writableDescriptor } from './fixtures/descriptors';

const rt = {
  Port,
  Flow,
  ReadableNode: ReadableNode<INodeConstructionOptions>,
  WriteableNode: WriteableNode<INodeConstructionOptions>,
} as const;

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
      override _read(o: PortAccessor): void {
        o('Output').send('payload');
      }
    }
    class Sink extends rt.WriteableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        rt.Port.I('Input').attach(this);
      }
      override _write(i: PortAccessor): void {
        i('Input').receive(p => received.push(p));
      }
    }

    const runtimeRegistry = new RuntimeNodeRegistry()
      .register('test-source', Source)
      .register('test-sink', Sink);

    const runner = new InterpreterGraphRunner(runtimeRegistry, options => new rt.Flow(options));

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

  /** An editor with a source sending 'payload' to a sink, run through `runner`. */
  function authored(trace?: boolean) {
    class Source extends rt.ReadableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        rt.Port.O('Output').attach(this);
      }
      override _read(o: PortAccessor): void {
        o('Output').send('payload');
      }
    }
    class Sink extends rt.WriteableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        rt.Port.I('Input').attach(this);
      }
      override _write(i: PortAccessor): void {
        i('Input').receive(() => undefined);
      }
    }
    const registry = new RuntimeNodeRegistry().register('test-source', Source).register('test-sink', Sink);
    const runner = new InterpreterGraphRunner(
      registry,
      options => new rt.Flow(options),
      ...(trace === undefined ? [] : [{ trace }]),
    );
    const core = createEditorCore({ graphRunner: runner });
    core.registry.register(readableDescriptor);
    core.registry.register(writableDescriptor);
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const w = core.registry.createNode('test-sink', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(w));
    core.commands.execute(new ConnectCommand('e1', out(r.id), inp(w.id)));
    return { core, source: r.id, sink: w.id };
  }

  it('traces a run by default, by editor node id', () => {
    const { core, source, sink } = authored();
    const handle = core.execution?.run(core.model);
    const events: INodeDeliveryEvent[] = [];
    handle?.onDelivery?.(event => events.push(event));
    handle?.dispose();

    expect(events.map(event => [event.sourceNodeId, event.targetNodeId, event.message])).toEqual([
      [source, sink, 'payload'],
    ]);
  });

  it('does not trace when the host turns it off', () => {
    const { core } = authored(false);
    const handle = core.execution?.run(core.model);
    const events: INodeDeliveryEvent[] = [];
    handle?.onDelivery?.(event => events.push(event));
    handle?.dispose();

    expect(events).toEqual([]);
  });

  it('shares the thread by default, so a graph that loops forever cannot freeze the editor', () => {
    class Source extends rt.ReadableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        rt.Port.O('Output').attach(this);
      }
    }
    const registry = new RuntimeNodeRegistry().register('test-source', Source);
    const graph = {
      nodeList: [{ code: 'test-source', name: 'source', type: 'R' as const, nodeId: 'source', bizData: { params: {} } }],
      connections: [],
    };
    const seen: IRuntimeFlowOptions[] = [];
    const createFlow = (flowOptions: IRuntimeFlowOptions) => {
      seen.push(flowOptions);
      return new rt.Flow(flowOptions);
    };

    new InterpreterGraphRunner(registry, createFlow).run(graph).dispose();
    new InterpreterGraphRunner(registry, createFlow, { slice: false }).run(graph).dispose();

    expect(seen.map(options => options.slice)).toEqual([{}, undefined]);
  });

  it('freezes messages by default, so a node that mutates what it received fails at once', () => {
    class Source extends rt.ReadableNode {
      constructor(opts: INodeConstructionOptions) {
        super(opts);
        rt.Port.O('Output').attach(this);
      }
    }
    const registry = new RuntimeNodeRegistry().register('test-source', Source);
    const graph = {
      nodeList: [{ code: 'test-source', name: 'source', type: 'R' as const, nodeId: 'source', bizData: { params: {} } }],
      connections: [],
    };
    const seen: IRuntimeFlowOptions[] = [];
    const createFlow = (flowOptions: IRuntimeFlowOptions) => {
      seen.push(flowOptions);
      return new rt.Flow(flowOptions);
    };

    new InterpreterGraphRunner(registry, createFlow).run(graph).dispose();
    new InterpreterGraphRunner(registry, createFlow, { freezeMessages: false }).run(graph).dispose();

    expect(seen.map(options => options.freezeMessages)).toEqual([true, undefined]);
  });
});
