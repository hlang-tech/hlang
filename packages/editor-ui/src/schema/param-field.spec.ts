import { describe, expect, it } from 'vitest';
import type { EditorNode, NodeDescriptor, ParamBag } from '@hlang-org/editor-core';
import { deriveParamSchema } from './param-field';

function descriptor(defaultParams: ParamBag): NodeDescriptor {
  return { code: 'n', kind: 'T', displayName: 'N', group: 'g', ports: [], defaultParams, runtimeResource: 'r' };
}

function node(params: ParamBag): EditorNode {
  return { id: 'a', code: 'n', kind: 'T', name: 'A', position: { x: 0, y: 0 }, params, ports: [] };
}

describe('deriveParamSchema', () => {
  it('infers each field from its value, in the order of the defaults', () => {
    const fields = deriveParamSchema(
      descriptor({ enabled: true, factor: 2, label: 'x', prompt: 'line\nline', list: [1], shape: { a: 1 }, none: null }),
      node({}),
    );
    expect(fields).toEqual([
      { key: 'enabled', label: 'Enabled', type: 'toggle', value: true },
      { key: 'factor', label: 'Factor', type: 'number', value: 2 },
      { key: 'label', label: 'Label', type: 'text', value: 'x' },
      { key: 'prompt', label: 'Prompt', type: 'textarea', value: 'line\nline' },
      { key: 'list', label: 'List', type: 'custom', fieldType: 'json', value: [1] },
      { key: 'shape', label: 'Shape', type: 'custom', fieldType: 'json', value: { a: 1 } },
      { key: 'none', label: 'None', type: 'custom', fieldType: 'json', value: null },
    ]);
  });

  it('turns camelCase, snake_case and kebab-case keys into labels', () => {
    const labels = deriveParamSchema(descriptor({ maxTokens: 1, hack_send: 1, 'frame-rate': 1 }), node({})).map(
      (field) => field.label,
    );
    expect(labels).toEqual(['Max Tokens', 'Hack send', 'Frame rate']);
  });

  it("shows the node's current value, falling back to the default, and only the descriptor's keys", () => {
    const fields = deriveParamSchema(descriptor({ factor: 2, label: 'x' }), node({ factor: 5, extra: 'ignored' }));
    expect(fields.map((field) => [field.key, field.value])).toEqual([
      ['factor', 5],
      ['label', 'x'],
    ]);
  });
});
