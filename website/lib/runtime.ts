/**
 * The website's one boundary to @hlang-org/runtime.
 *
 * The runtime ships loose (`any`) declarations. Every node class on this site
 * (the hero's live program and the Lumen editor's node kit) is written against
 * the strict shapes below; the runtime is adapted to them here, once, the same
 * way @hlang-org/interpreter does.
 */

import * as runtimeModule from '@hlang-org/runtime';
import type { INodeConstructionOptions, IRuntimeNode } from '@hlang-org/interpreter';

export interface RuntimePort {
  send(message: unknown): void;
  receive(listener: (message: unknown) => void): unknown;
  attach(node: unknown): void;
}

export type PortAccess = (name: string) => RuntimePort;

type NodeBase = new (options: INodeConstructionOptions) => IRuntimeNode & { readonly opts: INodeConstructionOptions };

interface RuntimeModule {
  readonly ReadableNode: NodeBase;
  readonly TransformNode: NodeBase;
  readonly WriteableNode: NodeBase;
  readonly Port: { I(name: string): RuntimePort; O(name: string): RuntimePort };
  readonly Flow: new () => { run(root: IRuntimeNode): void };
}

// The one boundary cast: the runtime ships `any`-typed declarations.
export const runtime = runtimeModule as unknown as RuntimeModule;

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
