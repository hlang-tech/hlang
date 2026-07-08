/**
 * `ViewStateService` — presentation-adjacent, per-node view flags.
 *
 * Tracks two editor-only booleans per node: `hidden` (removed from the canvas
 * view) and `locked` (pinned, not draggable/selectable). Like `SelectionService`
 * this is NEVER serialized into `IGraph` — it is a view concern, not part of the
 * portable computation graph — and it must survive model edits. Mutations emit a
 * `viewStateChanged` event so bindings can reflect the flags into the canvas.
 *
 * Setters are idempotent: setting a flag to the value it already holds is a
 * no-op and does NOT emit, so consumers never re-render on a non-change.
 */

import type { NodeId } from '../model/types';
import { IEventBus } from './interfaces';
import type { IViewStateService } from './interfaces';

export class ViewStateService implements IViewStateService {
  private readonly hidden = new Set<NodeId>();
  private readonly locked = new Set<NodeId>();

  constructor(@IEventBus private readonly bus: IEventBus) {}

  getHiddenNodes(): ReadonlySet<NodeId> {
    return this.hidden;
  }

  getLockedNodes(): ReadonlySet<NodeId> {
    return this.locked;
  }

  isHidden(id: NodeId): boolean {
    return this.hidden.has(id);
  }

  isLocked(id: NodeId): boolean {
    return this.locked.has(id);
  }

  setHidden(id: NodeId, hidden: boolean): void {
    if (this.applyFlag(this.hidden, id, hidden)) {
      this.bus.emit({ kind: 'viewStateChanged' });
    }
  }

  setLocked(id: NodeId, locked: boolean): void {
    if (this.applyFlag(this.locked, id, locked)) {
      this.bus.emit({ kind: 'viewStateChanged' });
    }
  }

  clear(): void {
    this.hidden.clear();
    this.locked.clear();
    this.bus.emit({ kind: 'viewStateChanged' });
  }

  /** Add/remove `id` in `set`; return whether the membership actually changed. */
  private applyFlag(set: Set<NodeId>, id: NodeId, on: boolean): boolean {
    if (on === set.has(id)) {
      return false;
    }
    if (on) {
      set.add(id);
    } else {
      set.delete(id);
    }
    return true;
  }
}
