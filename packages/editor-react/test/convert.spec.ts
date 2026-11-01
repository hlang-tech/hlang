/**
 * Model <-> React Flow conversion, with the O->I direction invariant.
 */

import { describe, it, expect } from 'vitest';
import type { EditorEdge, EditorNode } from '@hlang-org/editor-core';
import type { Connection } from '@xyflow/react';
import { toRFNode, toRFEdge, endpointsFromConnection } from '../src/mapping/convert';

function node(id: string, kind: 'R' | 'T' | 'W'): EditorNode {
  return {
    id,
    code: `code-${kind}`,
    kind,
    name: id,
    position: { x: 3, y: 4 },
    params: {},
    ports: [
      { id: 'Output', direction: 'O', name: 'Output', dataType: { name: 'DTO', kind: 'unknown' }, isError: false },
      { id: '@node/error', direction: 'O', name: 'error', dataType: { name: 'DTO', kind: 'unknown' }, isError: true },
      { id: 'Input', direction: 'I', name: 'Input', dataType: { name: 'DTO', kind: 'unknown' }, isError: false },
    ],
  };
}

describe('toRFNode', () => {
  it('maps id, kind->type, position, and carries the editor node in data', () => {
    const n = node('n1', 'T');
    const rf = toRFNode(n);
    expect(rf.id).toBe('n1');
    expect(rf.type).toBe('T');
    expect(rf.position).toEqual({ x: 3, y: 4 });
    expect(rf.data.editorNode).toBe(n);
  });
});

describe('toRFEdge', () => {
  it('maps source->source/sourceHandle (O) and target->target/targetHandle (I)', () => {
    const source = node('r1', 'R');
    const edge: EditorEdge = {
      id: 'e1',
      source: { nodeId: 'r1', portId: 'Output' },
      target: { nodeId: 't1', portId: 'Input' },
    };
    const rf = toRFEdge(edge, source);
    expect(rf.source).toBe('r1');
    expect(rf.sourceHandle).toBe('Output');
    expect(rf.target).toBe('t1');
    expect(rf.targetHandle).toBe('Input');
    expect(rf.data?.isError).toBe(false);
  });

  it('flags an edge originating from the @node/error port', () => {
    const source = node('t1', 'T');
    const edge: EditorEdge = {
      id: 'e2',
      source: { nodeId: 't1', portId: '@node/error' },
      target: { nodeId: 'w1', portId: 'Input' },
    };
    const rf = toRFEdge(edge, source);
    expect(rf.data?.isError).toBe(true);
  });
});

describe('endpointsFromConnection', () => {
  it('extracts O source and I target from a connection with handles', () => {
    const connection: Connection = {
      source: 'r1',
      sourceHandle: 'Output',
      target: 't1',
      targetHandle: 'Input',
    };
    const result = endpointsFromConnection(connection);
    expect(result).toEqual({
      source: { nodeId: 'r1', portId: 'Output' },
      target: { nodeId: 't1', portId: 'Input' },
    });
  });

  it('returns undefined when a handle is missing (hlang requires named ports)', () => {
    const connection: Connection = {
      source: 'r1',
      sourceHandle: null,
      target: 't1',
      targetHandle: 'Input',
    };
    expect(endpointsFromConnection(connection)).toBeUndefined();
  });
});
