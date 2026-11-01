/**
 * `SelectionService` — presentation-adjacent selection state.
 *
 * Never serialized into `IGraph`; must survive model edits. Emits a
 * `selectionChanged` event so bindings can react.
 */

import type { EdgeId, NodeId } from '../model/types';
import { IEventBus } from './interfaces';
import type { ISelectionService, SelectionMode } from './interfaces';

export class SelectionService implements ISelectionService {
  private readonly nodes = new Set<NodeId>();
  private readonly edges = new Set<EdgeId>();

  constructor(@IEventBus private readonly bus: IEventBus) {}

  getSelectedNodes(): ReadonlySet<NodeId> {
    return this.nodes;
  }

  getSelectedEdges(): ReadonlySet<EdgeId> {
    return this.edges;
  }

  selectNodes(ids: readonly NodeId[], mode: SelectionMode): void {
    applyMode(this.nodes, ids, mode);
    this.bus.emit({ kind: 'selectionChanged' });
  }

  selectEdges(ids: readonly EdgeId[], mode: SelectionMode): void {
    applyMode(this.edges, ids, mode);
    this.bus.emit({ kind: 'selectionChanged' });
  }

  isSelected(id: NodeId | EdgeId): boolean {
    return this.nodes.has(id) || this.edges.has(id);
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.bus.emit({ kind: 'selectionChanged' });
  }
}

function applyMode(set: Set<string>, ids: readonly string[], mode: SelectionMode): void {
  if (mode === 'replace') {
    set.clear();
    for (const id of ids) {
      set.add(id);
    }
    return;
  }
  if (mode === 'add') {
    for (const id of ids) {
      set.add(id);
    }
    return;
  }
  // toggle
  for (const id of ids) {
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
  }
}
