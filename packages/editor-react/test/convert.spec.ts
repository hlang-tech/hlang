/**
 * Model <-> React Flow conversion, with the O->I direction invariant.
 */

import { describe, it, expect } from 'vitest';
import type { EditorEdge, EditorNode } from '@hlang-org/editor-core';
import type { Connection } from '@xyflow/react';
import { toRFNode, toRFEdge, endpointsFromConnection } from '../src/mapping/convert';
import { RECONCILE_EVENTS } from '../src/hooks/reconcile-events';

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

  it('carries a bounded connection\'s capacity and overflow, and nothing for an unbounded one', () => {
    const source = node('r1', 'R');
    const ends = { source: { nodeId: 'r1', portId: 'Output' }, target: { nodeId: 't1', portId: 'Input' } };
    const bounded = toRFEdge({ id: 'b', ...ends, capacity: 4, overflow: 'drop-oldest' }, source);
    const unbounded = toRFEdge({ id: 'u', ...ends }, source);
    expect([bounded.data?.capacity, bounded.data?.overflow]).toEqual([4, 'drop-oldest']);
    expect(unbounded.data).not.toHaveProperty('capacity');
    expect(unbounded.data).not.toHaveProperty('overflow');
  });

  it('reflects whether the edge is selected in editor-core', () => {
    const source = node('r1', 'R');
    const edge: EditorEdge = { id: 'e', source: { nodeId: 'r1', portId: 'Output' }, target: { nodeId: 't1', portId: 'Input' } };
    expect([toRFEdge(edge, source).selected, toRFEdge(edge, source, { selected: true }).selected]).toEqual([false, true]);
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

describe('RECONCILE_EVENTS', () => {
  it('re-derives the view when an edge changes (its capacity, for one)', () => {
    expect(RECONCILE_EVENTS).toContain('edgeChanged');
  });
});
