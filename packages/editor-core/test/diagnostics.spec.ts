import { describe, it, expect } from 'vitest';
import { createEditorCore } from '../src';
import { AddNodeCommand, ConnectCommand } from '../src';
import { readableDescriptor, transformDescriptor, writableDescriptor } from './fixtures/descriptors';

/**
 * DiagnosticsService performs EDIT-TIME semantic validation, reusing
 * GraphTopology.lint() + ConnectionValidator + interpreter-truth rules.
 *
 * Severity model (agreed):
 *   - error   = the runtime would actually throw (bad direction, no R root,
 *               unregistered code)
 *   - warning = predictive; the runtime tolerates it but the node does nothing
 *               (unconnected T/W input, type mismatch, dead source)
 */
function setup() {
  const core = createEditorCore();
  core.registry.register(readableDescriptor);
  core.registry.register(transformDescriptor);
  core.registry.register(writableDescriptor);
  return core;
}

function codes(core: ReturnType<typeof setup>): string[] {
  return core.diagnostics.getDiagnostics().map(d => d.code).sort();
}

describe('DiagnosticsService', () => {
  it('is empty for a well-formed R→T→W chain', () => {
    const core = setup();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const t = core.registry.createNode('test-transform', { x: 1, y: 0 });
    const w = core.registry.createNode('test-sink', { x: 2, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(t));
    core.commands.execute(new AddNodeCommand(w));
    core.commands.execute(new ConnectCommand('e1', { nodeId: r.id, portId: 'Output' }, { nodeId: t.id, portId: 'Input' }));
    core.commands.execute(new ConnectCommand('e2', { nodeId: t.id, portId: 'Output' }, { nodeId: w.id, portId: 'Input' }));
    expect(core.diagnostics.getDiagnostics()).toEqual([]);
  });

  it('flags an unconnected sink as a predictive warning', () => {
    const core = setup();
    const w = core.registry.createNode('test-sink', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(w));
    const diags = core.diagnostics.getDiagnostics();
    const sink = diags.find(d => d.code === 'sink-no-upstream');
    expect(sink).toBeDefined();
    expect(sink?.severity).toBe('warning'); // runtime tolerates → predictive
    expect(sink?.nodeId).toBe(w.id);
  });

  it('flags a graph with nodes but no R root as an error', () => {
    const core = setup();
    const t = core.registry.createNode('test-transform', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(t));
    const diags = core.diagnostics.getDiagnostics();
    const noRoot = diags.find(d => d.code === 'no-source-root');
    expect(noRoot).toBeDefined();
    expect(noRoot?.severity).toBe('error'); // interpreter throws
  });

  it('recomputes and emits on graph change', () => {
    const core = setup();
    let count = 0;
    core.diagnostics.onChanged(() => (count += 1));
    const w = core.registry.createNode('test-sink', { x: 0, y: 0 });
    core.commands.execute(new AddNodeCommand(w));
    expect(count).toBeGreaterThan(0);
    expect(codes(core)).toContain('sink-no-upstream');
  });

  it('clears diagnostics once the problem is fixed', () => {
    const core = setup();
    const r = core.registry.createNode('test-source', { x: 0, y: 0 });
    const w = core.registry.createNode('test-sink', { x: 1, y: 0 });
    core.commands.execute(new AddNodeCommand(r));
    core.commands.execute(new AddNodeCommand(w));
    expect(codes(core)).toContain('sink-no-upstream');
    core.commands.execute(new ConnectCommand('e1', { nodeId: r.id, portId: 'Output' }, { nodeId: w.id, portId: 'Input' }));
    expect(core.diagnostics.getDiagnostics().find(d => d.code === 'sink-no-upstream')).toBeUndefined();
  });
});
