/**
 * GroupModel: explicit-membership groups (the basis for fractal composite
 * nodes). A group is a NAMED SET of node ids — independent of the IGraph
 * (which stays a pure executable IR) and independent of connectivity (linking
 * two groups must NOT merge them). Groups may nest (a group's parent is another
 * group), which is how the subgraph<->node isomorphism recurses.
 */

import { GroupModel } from '../src/services/group-model';

describe('GroupModel — explicit membership', () => {
  it('creates a group with members and reads them back', () => {
    const g = new GroupModel();
    const id = g.createGroup({ name: 'Stage A', members: ['n1', 'n2', 'n3'] });
    const group = g.getGroup(id);
    expect(group?.name).toBe('Stage A');
    expect([...(group?.members ?? [])].sort()).toEqual(['n1', 'n2', 'n3']);
    expect(group?.collapsed).toBe(false);
  });

  it('keeps two groups distinct even if their nodes are connected elsewhere', () => {
    // Connectivity lives in the graph, not here — grouping is purely explicit.
    const g = new GroupModel();
    const a = g.createGroup({ name: 'A', members: ['n1', 'n2'] });
    const b = g.createGroup({ name: 'B', members: ['n3', 'n4'] });
    expect(a).not.toBe(b);
    expect(g.listGroups()).toHaveLength(2);
  });

  it('adds and removes members', () => {
    const g = new GroupModel();
    const id = g.createGroup({ name: 'A', members: ['n1'] });
    g.addMember(id, 'n2');
    expect([...g.getGroup(id)!.members].sort()).toEqual(['n1', 'n2']);
    g.removeMember(id, 'n1');
    expect([...g.getGroup(id)!.members]).toEqual(['n2']);
  });

  it('reports which groups a node belongs to', () => {
    const g = new GroupModel();
    const a = g.createGroup({ name: 'A', members: ['shared', 'n1'] });
    const b = g.createGroup({ name: 'B', members: ['shared', 'n2'] });
    const ids = g.groupsContaining('shared').map(gr => gr.id).sort();
    expect(ids).toEqual([a, b].sort());
  });

  it('toggles collapsed state', () => {
    const g = new GroupModel();
    const id = g.createGroup({ name: 'A', members: ['n1'] });
    g.setCollapsed(id, true);
    expect(g.getGroup(id)?.collapsed).toBe(true);
  });

  it('removes a group without touching node membership of others', () => {
    const g = new GroupModel();
    const a = g.createGroup({ name: 'A', members: ['n1'] });
    const b = g.createGroup({ name: 'B', members: ['n2'] });
    g.removeGroup(a);
    expect(g.getGroup(a)).toBeUndefined();
    expect(g.getGroup(b)).toBeDefined();
  });

  it('supports nesting: a group can declare a parent group (fractal)', () => {
    const g = new GroupModel();
    const outer = g.createGroup({ name: 'Outer', members: ['n1', 'n2', 'n3', 'n4'] });
    const inner = g.createGroup({ name: 'Inner', members: ['n1', 'n2'], parentGroupId: outer });
    expect(g.getGroup(inner)?.parentGroupId).toBe(outer);
    expect(g.childGroups(outer).map(gr => gr.id)).toEqual([inner]);
    // Top-level groups exclude the nested one.
    expect(g.topLevelGroups().map(gr => gr.id)).toEqual([outer]);
  });

  it('serializes to and from a plain sidecar payload (IGraph stays untouched)', () => {
    const g = new GroupModel();
    g.createGroup({ name: 'A', members: ['n1', 'n2'] });
    g.createGroup({ name: 'B', members: ['n3'] });
    const dump = g.toJSON();
    const g2 = new GroupModel();
    g2.fromJSON(dump);
    expect(g2.listGroups().map(gr => gr.name).sort()).toEqual(['A', 'B']);
    expect([...g2.listGroups().flatMap(gr => [...gr.members])].sort()).toEqual(['n1', 'n2', 'n3']);
  });

  it('drops a node from every group when it is deleted from the graph', () => {
    const g = new GroupModel();
    const a = g.createGroup({ name: 'A', members: ['n1', 'n2'] });
    g.forgetNode('n1');
    expect([...g.getGroup(a)!.members]).toEqual(['n2']);
  });
});
