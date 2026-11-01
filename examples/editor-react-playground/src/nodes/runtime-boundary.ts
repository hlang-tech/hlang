/**
 * The playground node kit's access to `@hlang-org/runtime`. Every node file
 * imports `rt`, the port type and the option types from this module: each node
 * kind here is constructed from the interpreter's options, so the interpreter's
 * registry takes the classes as they are.
 */

import { Flow, Port, ReadableNode, TransformNode, WriteableNode } from '@hlang-org/runtime';
import type { INodeConstructionOptions, NodeConstructor } from '@hlang-org/interpreter';

/** A runtime port (an RxJS stream under the hood). */
export type RuntimePortLike = Port;

/** The runtime, with every node kind constructed from the interpreter's options. */
export const rt = {
  Port,
  Flow,
  ReadableNode: ReadableNode<INodeConstructionOptions>,
  TransformNode: TransformNode<INodeConstructionOptions>,
  WriteableNode: WriteableNode<INodeConstructionOptions>,
} as const;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A node's construction params bag (`bizData.params`). */
export function paramsOf(node: { readonly opts: INodeConstructionOptions }): Readonly<Record<string, unknown>> {
  const params = node.opts.config.params;
  return isRecord(params) ? params : {};
}

export type { INodeConstructionOptions, NodeConstructor };
