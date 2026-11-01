/**
 * Serialization fidelity: model <-> IGraph, with the load-bearing direction
 * invariant (edge source -> connection.Output, edge target -> connection.Input).
 */

import { createEditorCore, AddNodeCommand, ConnectCommand } from '../src';
import type { Endpoint } from '../src';
import type { IGraph } from '@hlang-org/interpreter';
import {
  readableDescriptor,
  transformDescriptor,
} from './fixtures/descriptors';

const out = (nodeId: string): Endpoint => ({ nodeId, portId: 'Output' });
const inp = (nodeId: string): Endpoint => ({ nodeId, portId: 'Input' });

describe('SerializationService', () => {
  it('case 4: edge source=R.Output/target=T.Input serializes to Output=R, Input=T', () => {
    const core = createEditorCore();
    core.registry.register(readableDescriptor);
    core.registry.register(transformDescriptor);
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));
    core.commands.execute(new ConnectCommand('e1', out(r.id), inp(t.id)));

    const graph = core.serialization.toIGraph(core.model);

    expect(graph.connections).toHaveLength(1);
    const conn = graph.connections[0];
    expect(conn?.Output.nodeId).toBe(r.id);
    expect(conn?.Input.nodeId).toBe(t.id);
    expect(conn?.Output.portConf?.id).toBe('Output');
    expect(conn?.Input.portConf?.id).toBe('Input');
  });

  it('case 5: fromIGraph -> toIGraph round-trips on modeled fields', () => {
    const source: IGraph = {
      nodeList: [
        {
          code: 'test-source',
          name: 'Source',
          type: 'R',
          nodeId: 'r1',
          bizData: { params: { value: 'x' } },
          position: { x: 10, y: 20 },
          portInfo: { Output: [{ id: 'Output', name: 'Output' }], Input: [] },
        },
        {
          code: 'test-sink',
          name: 'Sink',
          type: 'W',
          nodeId: 'w1',
          bizData: { params: {} },
          position: { x: 30, y: 40 },
          portInfo: { Input: [{ id: 'Input', name: 'Input' }], Output: [] },
        },
      ],
      connections: [
        {
          Output: { nodeId: 'r1', portConf: { id: 'Output' } },
          Input: { nodeId: 'w1', portConf: { id: 'Input' } },
        },
      ],
    };

    const core = createEditorCore();
    const snapshot = core.serialization.fromIGraph(source);
    core.model.restore(snapshot);
    const roundTripped = core.serialization.toIGraph(core.model);

    // Node identity, kind, params, position preserved.
    expect(roundTripped.nodeList.map(n => n.nodeId).sort()).toEqual(['r1', 'w1']);
    const r = roundTripped.nodeList.find(n => n.nodeId === 'r1');
    expect(r?.type).toBe('R');
    expect(r?.position).toEqual({ x: 10, y: 20 });
    expect(r?.bizData?.params).toEqual({ value: 'x' });
    // Connection direction preserved.
    expect(roundTripped.connections[0]?.Output.nodeId).toBe('r1');
    expect(roundTripped.connections[0]?.Input.nodeId).toBe('w1');
  });
});
