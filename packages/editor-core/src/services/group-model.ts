/**
 * `GroupModel` — explicit-membership groups: the editor-side organization layer
 * that makes a subgraph a first-class, nameable, collapsible, NESTABLE thing.
 *
 * Design decisions (load-bearing):
 *   - A group is an explicit SET of node ids, NOT a connected component. Linking
 *     two groups in the graph must never merge them — organization is the user's
 *     intent, independent of wiring.
 *   - Groups are NOT part of the IGraph. IGraph is the executable IR; groups are
 *     editor sidecar data (`toJSON`/`fromJSON`) saved alongside it. The runtime
 *     and interpreter never see groups.
 *   - Groups may nest via `parentGroupId`, so the subgraph<->node isomorphism
 *     recurses (a group inside a group inside a group…).
 *
 * The group's outward interface (its in/out ports as a composite node) is NOT
 * computed here — that is pure graph topology, provided by
 * `GraphTopology.extractInterface(members)`. This model owns only membership.
 */

import type { NodeId } from '../model/types';

export type GroupId = string;

/** An explicit group of nodes. `members` is a set of node ids. */
export interface EditorGroup {
  readonly id: GroupId;
  readonly name: string;
  readonly members: ReadonlySet<NodeId>;
  readonly collapsed: boolean;
  /** When set, this group is nested inside another (fractal composition). */
  readonly parentGroupId?: GroupId;
}

/** Inputs to create a group. */
export interface CreateGroupInput {
  readonly name: string;
  readonly members: readonly NodeId[];
  readonly parentGroupId?: GroupId;
}

/** The serializable sidecar payload (never merged into IGraph). */
export interface GroupSidecar {
  readonly groups: readonly {
    readonly id: GroupId;
    readonly name: string;
    readonly members: readonly NodeId[];
    readonly collapsed: boolean;
    readonly parentGroupId?: GroupId;
  }[];
}

interface MutableGroup {
  id: GroupId;
  name: string;
  members: Set<NodeId>;
  collapsed: boolean;
  parentGroupId?: GroupId;
}

export class GroupModel {
  private readonly groups = new Map<GroupId, MutableGroup>();
  private counter = 0;

  private nextId(): GroupId {
    this.counter += 1;
    return `group-${String(this.counter)}`;
  }

  createGroup(input: CreateGroupInput): GroupId {
    const id = this.nextId();
    const group: MutableGroup = {
      id,
      name: input.name,
      members: new Set(input.members),
      collapsed: false,
      ...(input.parentGroupId !== undefined ? { parentGroupId: input.parentGroupId } : {}),
    };
    this.groups.set(id, group);
    return id;
  }

  removeGroup(id: GroupId): void {
    this.groups.delete(id);
    // Orphan any children (promote to top level) rather than cascade-delete.
    for (const group of this.groups.values()) {
      if (group.parentGroupId === id) {
        delete group.parentGroupId;
      }
    }
  }

  getGroup(id: GroupId): EditorGroup | undefined {
    return this.groups.get(id);
  }

  listGroups(): readonly EditorGroup[] {
    return [...this.groups.values()];
  }

  topLevelGroups(): readonly EditorGroup[] {
    return [...this.groups.values()].filter(g => g.parentGroupId === undefined);
  }

  childGroups(parentId: GroupId): readonly EditorGroup[] {
    return [...this.groups.values()].filter(g => g.parentGroupId === parentId);
  }

  groupsContaining(nodeId: NodeId): readonly EditorGroup[] {
    return [...this.groups.values()].filter(g => g.members.has(nodeId));
  }

  addMember(id: GroupId, nodeId: NodeId): void {
    this.groups.get(id)?.members.add(nodeId);
  }

  removeMember(id: GroupId, nodeId: NodeId): void {
    this.groups.get(id)?.members.delete(nodeId);
  }

  rename(id: GroupId, name: string): void {
    const group = this.groups.get(id);
    if (group !== undefined) {
      group.name = name;
    }
  }

  setCollapsed(id: GroupId, collapsed: boolean): void {
    const group = this.groups.get(id);
    if (group !== undefined) {
      group.collapsed = collapsed;
    }
  }

  /** Remove a node from every group (call when the node leaves the graph). */
  forgetNode(nodeId: NodeId): void {
    for (const group of this.groups.values()) {
      group.members.delete(nodeId);
    }
  }

  toJSON(): GroupSidecar {
    return {
      groups: [...this.groups.values()].map(g => ({
        id: g.id,
        name: g.name,
        members: [...g.members],
        collapsed: g.collapsed,
        ...(g.parentGroupId !== undefined ? { parentGroupId: g.parentGroupId } : {}),
      })),
    };
  }

  fromJSON(sidecar: GroupSidecar): void {
    this.groups.clear();
    let maxSeen = 0;
    for (const g of sidecar.groups) {
      this.groups.set(g.id, {
        id: g.id,
        name: g.name,
        members: new Set(g.members),
        collapsed: g.collapsed,
        ...(g.parentGroupId !== undefined ? { parentGroupId: g.parentGroupId } : {}),
      });
      const match = /^group-(\d+)$/.exec(g.id);
      if (match?.[1] !== undefined) {
        maxSeen = Math.max(maxSeen, Number(match[1]));
      }
    }
    this.counter = maxSeen;
  }
}
