/**
 * The website's access to @hlang-org/runtime. Every node class on this site
 * (the hero's live program and the Lumen editor's node kit) extends one of the
 * runtime's node kinds, constructed with the interpreter's options, so the
 * interpreter's registry takes the classes as they are.
 */

import { Flow, Port, ReadableNode, TransformNode, WriteableNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';
import type { INodeConstructionOptions } from '@hlang-org/interpreter';

/** A node's port accessor: `$i` for inputs, `$o` for outputs. */
export type PortAccess = PortAccessor;

/** The runtime, with every node kind constructed from the interpreter's options. */
export const runtime = {
  ReadableNode: ReadableNode<INodeConstructionOptions>,
  TransformNode: TransformNode<INodeConstructionOptions>,
  WriteableNode: WriteableNode<INodeConstructionOptions>,
  Port,
  Flow,
} as const;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A node's parameters: the `params` bag of its configuration. */
export function paramsOf(options: INodeConstructionOptions): Readonly<Record<string, unknown>> {
  const params = options.config['params'];
  return isRecord(params) ? params : {};
}

/** A numeric parameter, or `fallback` when it is missing or not a finite number. */
export function numberParam(options: INodeConstructionOptions, name: string, fallback: number): number {
  const value = paramsOf(options)[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
