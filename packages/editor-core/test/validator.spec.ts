/**
 * Connection validation: encodes hlang's O->I wiring semantics.
 */

import { createEditorCore } from '../src';
import type { Endpoint } from '../src';
import {
  readableDescriptor,
  transformDescriptor,
  writableDescriptor,
} from './fixtures/descriptors';

function setup() {
  const core = createEditorCore();
  core.registry.register(readableDescriptor);
  core.registry.register(transformDescriptor);
  core.registry.register(writableDescriptor);
  const r = core.registry.createNode('test-source', { x: 0, y: 0 });
  const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
  const w = core.registry.createNode('test-sink', { x: 2, y: 0 });
  core.model.addNode(r);
  core.model.addNode(t);
  core.model.addNode(w);
  return { core, r, t, w };
}

const out = (nodeId: string): Endpoint => ({ nodeId, portId: 'Output' });
const inp = (nodeId: string): Endpoint => ({ nodeId, portId: 'Input' });

describe('ConnectionValidator', () => {
  it('case 1: accepts O(source) -> I(target) and rejects the reverse', () => {
    const { core, r, t } = setup();
    expect(core.validator.validate(out(r.id), inp(t.id), core.model).ok).toBe(true);
    // Reversed: target endpoint is an O port, source endpoint is an I port.
    const reversed = core.validator.validate(inp(t.id), out(r.id), core.model);
    expect(reversed.ok).toBe(false);
    expect(reversed.reason).toBe('bad-direction');
  });

  it('case 2: a W node exposes only an Input port and no error port', () => {
    const { w } = setup();
    const portIds = w.ports.map(p => p.id);
    expect(portIds).toEqual(['Input']);
    expect(w.ports.some(p => p.isError)).toBe(false);
  });

  it('case 3: an R descriptor includes the @node/error output port', () => {
    const { r } = setup();
    const errorPort = r.ports.find(p => p.isError);
    expect(errorPort).toBeDefined();
    expect(errorPort?.direction).toBe('O');
    expect(errorPort?.id).toBe('@node/error');
  });

  it('case 8: T<->T feedback loops are allowed', () => {
    const { core } = setup();
    const t1 = core.registry.createNode('test-transform', { x: 0, y: 0 });
    const t2 = core.registry.createNode('test-transform', { x: 1, y: 0 });
    core.model.addNode(t1);
    core.model.addNode(t2);
    expect(core.validator.validate(out(t1.id), inp(t2.id), core.model).ok).toBe(true);
    core.model.addEdge({ id: 'e1', source: out(t1.id), target: inp(t2.id) });
    // The back-edge closing the loop must also be accepted.
    expect(core.validator.validate(out(t2.id), inp(t1.id), core.model).ok).toBe(true);
  });

  it('canLink: model-free port check (O->I ok, reverse rejected), no model needed', () => {
    const { core } = setup();
    const outPort = readableDescriptor.ports.find(p => p.id === 'Output');
    const inPort = transformDescriptor.ports.find(p => p.id === 'Input');
    if (outPort === undefined || inPort === undefined) {
      throw new Error('fixture ports missing');
    }
    // O -> I is linkable purely from the descriptors — the candidate node need
    // not exist in any model (this powers design-time "what can connect here").
    expect(core.validator.canLink(outPort, inPort).ok).toBe(true);
    // Reverse (I as source, O as target) is a direction error.
    expect(core.validator.canLink(inPort, outPort).reason).toBe('bad-direction');
    // Two inputs cannot link.
    expect(core.validator.canLink(inPort, inPort).reason).toBe('bad-direction');
  });

  it('rejects self-connection and duplicate edges', () => {
    const { core, r, t } = setup();
    expect(core.validator.validate(out(r.id), inp(r.id), core.model).reason).toBe(
      'self-connection',
    );
    core.model.addEdge({ id: 'e1', source: out(r.id), target: inp(t.id) });
    expect(core.validator.validate(out(r.id), inp(t.id), core.model).reason).toBe(
      'duplicate',
    );
  });
});
