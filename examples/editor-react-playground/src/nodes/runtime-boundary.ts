/**
 * The single, documented boundary to `@hlang-org/runtime`'s loose types.
 *
 * The runtime ships permissive declarations; the rest of the playground node
 * kit is written against these strict, minimal shapes and adapts the runtime
 * here once. Every node file imports `rt`, `Port`-like helpers, and the option
 * types from this module — never `@hlang-org/runtime` directly — so the cast
 * lives in exactly one place (per the repo's "one documented boundary" rule).
 */

import * as runtime from '@hlang-org/runtime';
import type {
  INodeConstructionOptions,
  NodeConstructor,
} from '@hlang-org/interpreter';

/** A runtime port as this kit uses it (RxJS stream under the hood). */
export interface RuntimePortLike {
  send(msg: unknown): void;
  receive(next: (msg: unknown) => void): unknown;
  attach(node: unknown): void;
}

/** The runtime statics the kit relies on. */
interface RuntimeStatics {
  Port: {
    I(name: string): RuntimePortLike;
    O(name: string): RuntimePortLike;
  };
  Flow: new (opts?: Record<string, unknown>) => { run(root: unknown): void };
  ReadableNode: new (opts: unknown) => object;
  TransformNode: new (opts: unknown) => object;
  WriteableNode: new (opts: unknown) => object;
}

/** The adapted runtime — the ONE place the loose runtime types are cast. */
export const rt = runtime as unknown as RuntimeStatics;

/** Read a node instance's construction params bag (`bizData.params`). */
interface NodeOptsHolder {
  opts: { config?: { params?: Record<string, unknown> } };
}

export function paramsOf(node: object): Record<string, unknown> {
  return (node as unknown as NodeOptsHolder).opts.config?.params ?? {};
}

/**
 * Adapt a concrete runtime node class (which extends `rt.ReadableNode` etc.,
 * typed loosely as `object`) to the strict `NodeConstructor` the interpreter
 * registry expects. The one controlled cast per node class.
 */
export function asCtor(nodeClass: new (opts: INodeConstructionOptions) => object): NodeConstructor {
  return nodeClass as unknown as NodeConstructor;
}

export type { INodeConstructionOptions, NodeConstructor };
