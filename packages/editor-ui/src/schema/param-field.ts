/**
 * Schema-driven property editing. A node's editable parameters are derived into
 * a strongly-typed `ParamField[]` (zero `any`), which the inspector renders as
 * form controls. Field types are inferred from each default value's runtime
 * type — the only metadata a `NodeDescriptor` carries today (`defaultParams`).
 */

import type { NodeDescriptor, EditorNode, ParamValue } from '@hlang-org/editor-core';

/** Common fields on every derived form field. */
export interface ParamFieldBase {
  readonly key: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** A discriminated union of the built-in form field types (zero `any`). */
export type ParamField =
  | (ParamFieldBase & { readonly type: 'text'; readonly value: string })
  | (ParamFieldBase & { readonly type: 'textarea'; readonly value: string })
  | (ParamFieldBase & { readonly type: 'number'; readonly value: number })
  | (ParamFieldBase & { readonly type: 'toggle'; readonly value: boolean })
  | (ParamFieldBase & {
      readonly type: 'custom';
      readonly fieldType: string;
      readonly value: ParamValue;
    });

/** Turn a param key like `maxTokens` / `hack_send` into a readable label. */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Infer a field from a key and its current value. */
function fieldFor(key: string, value: ParamValue): ParamField {
  const label = humanizeKey(key);
  if (typeof value === 'boolean') {
    return { key, label, type: 'toggle', value };
  }
  if (typeof value === 'number') {
    return { key, label, type: 'number', value };
  }
  if (typeof value === 'string') {
    // Multi-line strings (e.g. code / prompts) get a textarea.
    const type = value.includes('\n') ? 'textarea' : 'text';
    return { key, label, type, value };
  }
  // Arrays, nested objects, null — surface via the custom control registry.
  return { key, label, type: 'custom', fieldType: 'json', value };
}

/**
 * Derive the ordered form schema for a node. Keys come from the descriptor's
 * `defaultParams` (the canonical param set); current values come from the live
 * node, falling back to the default.
 */
export function deriveParamSchema(
  descriptor: NodeDescriptor,
  node: EditorNode,
): readonly ParamField[] {
  const fields: ParamField[] = [];
  for (const key of Object.keys(descriptor.defaultParams)) {
    const current = key in node.params ? node.params[key] : descriptor.defaultParams[key];
    fields.push(fieldFor(key, current ?? null));
  }
  return fields;
}
