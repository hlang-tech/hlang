/**
 * `NodeRegistry` — design-time descriptors keyed by `code`.
 *
 * Feeds the palette (`list`), the validator (port DTO types), and node creation
 * (`createNode` from a descriptor's defaults). The runtime-side twin — the
 * `code -> NodeClass` map — lives in `@hlang-org/interpreter`.
 */

import type { EditorNode, NodeDescriptor, Point } from '../model/types';
import type { INodeRegistry } from './interfaces';
import { IIdGenerator } from './id-generator';

export class NodeRegistry implements INodeRegistry {
  private readonly descriptors = new Map<string, NodeDescriptor>();

  constructor(@IIdGenerator private readonly ids: IIdGenerator) {}

  register(descriptor: NodeDescriptor): void {
    this.descriptors.set(descriptor.code, descriptor);
  }

  get(code: string): NodeDescriptor | undefined {
    return this.descriptors.get(code);
  }

  list(filter?: { readonly group?: string }): readonly NodeDescriptor[] {
    const all = [...this.descriptors.values()];
    if (filter?.group === undefined) {
      return all;
    }
    return all.filter(descriptor => descriptor.group === filter.group);
  }

  createNode(code: string, position: Point): EditorNode {
    const descriptor = this.descriptors.get(code);
    if (descriptor === undefined) {
      throw new Error(`NodeRegistry: no descriptor registered for code "${code}".`);
    }
    return {
      id: this.ids.nextNodeId(),
      code: descriptor.code,
      kind: descriptor.kind,
      name: descriptor.displayName,
      position,
      params: descriptor.defaultParams,
      ports: descriptor.ports,
    };
  }
}
