/**
 * Node registry: maps an hlang `code` to a concrete runtime node class.
 *
 * This is the runtime-side twin of the editor's design-time registry. When the
 * interpreter walks an `IGraph`, it looks up each node's `code` here to obtain
 * the constructor to instantiate. Keys are matched exactly as they appear in
 * the graph's `code` field; callers register whatever key their graphs use.
 */

import type { NodeConstructor } from './runtime-contract';

/** Read-only view of a node registry used during interpretation. */
export interface INodeRegistry {
  /** Return the constructor registered for `code`, or `undefined`. */
  get(code: string): NodeConstructor | undefined;
  /** Whether a constructor is registered for `code`. */
  has(code: string): boolean;
  /** All registered codes, in insertion order. */
  codes(): readonly string[];
}

/** A mutable node registry. */
export class NodeRegistry implements INodeRegistry {
  private readonly entries = new Map<string, NodeConstructor>();

  /**
   * Register a node class under `code`. Re-registering the same code replaces
   * the previous entry (last write wins), which keeps hot-reloading simple.
   */
  register(code: string, ctor: NodeConstructor): this {
    this.entries.set(code, ctor);
    return this;
  }

  get(code: string): NodeConstructor | undefined {
    return this.entries.get(code);
  }

  has(code: string): boolean {
    return this.entries.has(code);
  }

  codes(): readonly string[] {
    return Array.from(this.entries.keys());
  }
}
