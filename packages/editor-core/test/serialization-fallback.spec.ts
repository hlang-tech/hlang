/**
 * Serialization fallback paths and validator defensive branches.
 */

import { describe, it, expect } from 'vitest';
import { createEditorCore, ConnectionValidator, GraphModel } from '../src';
import type { EditorNode, Endpoint } from '../src';
import type { IGraph } from '@hlang-org/interpreter';

describe('SerializationService fallbacks', () => {
  it('applies defaults when position/portConf/id/name are absent', () => {
    const graph: IGraph = {
      nodeList: [
        {
          code: 'c',
          name: 'N',
          type: 'T',
          nodeId: 'n1',
          // no position, no bizData
          portInfo: {
            // entries missing id/name -> defaults by direction
            Input: [{}],
            Output: [{}],
          },
        },
      ],
      connections: [
        {
          // no portConf -> default port ids
          Output: { nodeId: 'n1' },
          Input: { nodeId: 'n1' },
        },
      ],
    };

    const core = createEditorCore();
    const snapshot = core.serialization.fromIGraph(graph);
    const node = snapshot.nodes[0];
    expect(node?.position).toEqual({ x: 0, y: 0 });
    expect(node?.params).toEqual({});
    const inPort = node?.ports.find(p => p.direction === 'I');
    const outPort = node?.ports.find(p => p.direction === 'O');
    expect(inPort?.id).toBe('Input');
    expect(outPort?.id).toBe('Output');

    const edge = snapshot.edges[0];
    expect(edge?.source.portId).toBe('Output');
    expect(edge?.target.portId).toBe('Input');
  });

  it('marks a serialized @node/error port as an error port on import', () => {
    const graph: IGraph = {
      nodeList: [
        {
          code: 'c',
          name: 'N',
          type: 'R',
          nodeId: 'n1',
          portInfo: { Output: [{ id: '@node/error', name: 'error' }], Input: [] },
        },
      ],
      connections: [],
    };
    const core = createEditorCore();
    const snapshot = core.serialization.fromIGraph(graph);
    const errorPort = snapshot.nodes[0]?.ports.find(p => p.isError);
    expect(errorPort?.id).toBe('@node/error');
  });
});

describe('ConnectionValidator defensive branches', () => {
  const validator = new ConnectionValidator();
  const out = (nodeId: string): Endpoint => ({ nodeId, portId: 'Output' });
  const inp = (nodeId: string): Endpoint => ({ nodeId, portId: 'Input' });

  function nodeWith(id: string, ports: EditorNode['ports']): EditorNode {
    return { id, code: 'c', kind: 'T', name: id, position: { x: 0, y: 0 }, params: {}, ports };
  }

  it('rejects when a node is missing', () => {
    const model = new GraphModel();
    expect(validator.validate(out('a'), inp('b'), model).reason).toBe('missing-node');
  });

  it('rejects when a port is missing', () => {
    const model = new GraphModel();
    model.addNode(nodeWith('a', [{ id: 'Output', direction: 'O', name: 'o', dataType: { name: 'x', kind: 'unknown' }, isError: false }]));
    model.addNode(nodeWith('b', []));
    expect(validator.validate(out('a'), inp('b'), model).reason).toBe('missing-port');
  });

  it('rejects incompatible intrinsic types', () => {
    const model = new GraphModel();
    model.addNode(
      nodeWith('a', [{ id: 'Output', direction: 'O', name: 'o', dataType: { name: 'string', kind: 'intrinsic' }, isError: false }]),
    );
    model.addNode(
      nodeWith('b', [{ id: 'Input', direction: 'I', name: 'i', dataType: { name: 'number', kind: 'intrinsic' }, isError: false }]),
    );
    expect(validator.validate(out('a'), inp('b'), model).reason).toBe('type-mismatch');
  });

  it('accepts matching intrinsic types', () => {
    const model = new GraphModel();
    model.addNode(
      nodeWith('a', [{ id: 'Output', direction: 'O', name: 'o', dataType: { name: 'string', kind: 'intrinsic' }, isError: false }]),
    );
    model.addNode(
      nodeWith('b', [{ id: 'Input', direction: 'I', name: 'i', dataType: { name: 'string', kind: 'intrinsic' }, isError: false }]),
    );
    expect(validator.validate(out('a'), inp('b'), model).ok).toBe(true);
  });
});
