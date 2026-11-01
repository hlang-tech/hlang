import { describe, it, expect } from 'vitest';
import { parseGraphSnapshot } from '../src';
import type { EditorEdge, EditorNode, GraphSnapshot } from '../src';

const node: EditorNode = {
  id: 'n1',
  code: 'scale',
  kind: 'T',
  name: 'Scale',
  position: { x: 10, y: -4.5 },
  params: { factor: 2, label: 'x', on: true, none: null, list: [1, 'a', { deep: [false] }] },
  ports: [
    { id: 'Input', direction: 'I', name: 'Input', dataType: { name: 'number', kind: 'intrinsic' }, isError: false },
    { id: 'Output', direction: 'O', name: 'Output', dataType: { name: 'number', kind: 'intrinsic' }, isError: false, stream: 'live' },
  ],
  raw: { extra: 1 },
};
const edge: EditorEdge = { id: 'e1', source: { nodeId: 'n1', portId: 'Output' }, target: { nodeId: 'n2', portId: 'Input' } };
const snapshot: GraphSnapshot = { nodes: [node], edges: [edge] };

/** The snapshot as it arrives from JSON: plain data, not typed. */
function fromJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe('parseGraphSnapshot', () => {
  it('returns a valid snapshot as it is', () => {
    expect(parseGraphSnapshot(fromJson(snapshot))).toEqual(snapshot);
  });

  it('keeps optional fields only when they are present', () => {
    const { raw: _raw, ...withoutRaw } = node;
    const parsed = parseGraphSnapshot(fromJson({ nodes: [withoutRaw], edges: [] }));
    expect(parsed?.nodes[0]).not.toHaveProperty('raw');
    expect(parsed?.nodes[0]?.ports[0]).not.toHaveProperty('stream');
  });

  it.each([
    ['a non-object', 'nodes'],
    ['missing arrays', { nodes: [] }],
    ['an unknown node kind', { nodes: [{ ...node, kind: 'X' }], edges: [] }],
    ['a non-numeric position', { nodes: [{ ...node, position: { x: '1', y: 0 } }], edges: [] }],
    ['a bad port direction', { nodes: [{ ...node, ports: [{ ...node.ports[0], direction: 'X' }] }], edges: [] }],
    ['a bad data type kind', { nodes: [{ ...node, ports: [{ ...node.ports[0], dataType: { name: 'n', kind: 'magic' } }] }], edges: [] }],
    ['an edge without a target port', { nodes: [node], edges: [{ ...edge, target: { nodeId: 'n2' } }] }],
    ['an edge id that is not a string', { nodes: [node], edges: [{ ...edge, id: 7 }] }],
  ])('rejects %s', (_label, value) => {
    expect(parseGraphSnapshot(fromJson(value))).toBeNull();
  });

  it('rejects a position that is not finite', () => {
    expect(parseGraphSnapshot({ nodes: [{ ...node, position: { x: Infinity, y: 0 } }], edges: [] })).toBeNull();
  });

  // JSON only carries valid parameter values; values that are not data can
  // only come from code, so these cases are built directly.
  it('rejects a parameter that is not data', () => {
    expect(parseGraphSnapshot({ nodes: [{ ...node, params: { run: () => 1 } }], edges: [] })).toBeNull();
    expect(parseGraphSnapshot({ nodes: [{ ...node, params: { nested: { gone: undefined } } }], edges: [] })).toBeNull();
    expect(parseGraphSnapshot({ nodes: [{ ...node, params: { ratio: Number.NaN } }], edges: [] })).toBeNull();
  });
});
