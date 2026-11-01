/**
 * Unit tests for the pure node-search model: fuzzy ranking of registry
 * descriptors, and the "connectable target" filter that a link released into
 * empty space uses to offer only nodes it can legally connect to.
 *
 * These are pure functions (no React, no DOM) — the deliberate exception to
 * editor-ui's "no component tests" policy, since search ranking and connection
 * legality are behavior worth locking down.
 */

import {
  descriptorCandidates,
  connectableCandidates,
  searchNodes,
} from './node-search-model';
import type { PendingConnection } from './node-search-model';
import type {
  NodeDescriptor,
  PortDescriptor,
  IConnectionValidator,
  ValidationResult,
} from '@hlang-org/editor-core';

const dto = { name: 'DTO', kind: 'interface' as const };

function descriptor(over: Partial<NodeDescriptor> & Pick<NodeDescriptor, 'code' | 'kind'>): NodeDescriptor {
  return {
    displayName: over.code,
    group: 'test',
    ports: [],
    defaultParams: {},
    runtimeResource: `@test/${over.code}@1`,
    ...over,
  };
}

const TEXT_SOURCE = descriptor({
  code: 'text-source',
  kind: 'R',
  displayName: 'Text Source',
  ports: [{ id: 'Output', direction: 'O', name: 'Output', dataType: dto, isError: false }],
});
const UPPERCASE = descriptor({
  code: 'uppercase',
  kind: 'T',
  displayName: 'Uppercase',
  ports: [
    { id: 'Input', direction: 'I', name: 'Input', dataType: dto, isError: false },
    { id: 'Output', direction: 'O', name: 'Output', dataType: dto, isError: false },
  ],
});
const CONSOLE_SINK = descriptor({
  code: 'console-sink',
  kind: 'W',
  displayName: 'Console',
  ports: [{ id: 'Input', direction: 'I', name: 'Input', dataType: dto, isError: false }],
});

const ALL: readonly NodeDescriptor[] = [TEXT_SOURCE, UPPERCASE, CONSOLE_SINK];

describe('descriptorCandidates', () => {
  it('maps each descriptor to a fuzzy candidate keyed by display name', () => {
    const candidates = descriptorCandidates(ALL);
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toEqual({ text: 'Text Source', value: TEXT_SOURCE });
  });
});

describe('searchNodes', () => {
  it('ranks by fuzzy relevance, best first', () => {
    const results = searchNodes('upper', ALL);
    expect(results[0]?.value.code).toBe('uppercase');
  });

  it('drops non-matches', () => {
    const results = searchNodes('zzz', ALL);
    expect(results).toHaveLength(0);
  });

  it('returns all in registry order for an empty query', () => {
    const results = searchNodes('', ALL);
    expect(results.map(r => r.value.code)).toEqual(['text-source', 'uppercase', 'console-sink']);
  });
});

describe('connectableCandidates', () => {
  // A validator whose model-free canLink approves O->I between compatible ports
  // and rejects the rest — a faithful stand-in for the real ConnectionValidator's
  // direction rule, sufficient to prove the filter wires source/target correctly.
  const validator: Pick<IConnectionValidator, 'canLink'> = {
    canLink(sourcePort: PortDescriptor, targetPort: PortDescriptor): ValidationResult {
      const ok = sourcePort.direction === 'O' && targetPort.direction === 'I';
      return ok ? { ok: true } : { ok: false, reason: 'bad-direction' };
    },
  };
  const asValidator = validator as IConnectionValidator;

  const outPort: PortDescriptor = { id: 'Output', direction: 'O', name: 'Output', dataType: dto, isError: false };
  const inPort: PortDescriptor = { id: 'Input', direction: 'I', name: 'Input', dataType: dto, isError: false };

  it('offers only descriptors with a port that legally accepts the dangling source', () => {
    const pending: PendingConnection = {
      fromEndpoint: { nodeId: 'n1', portId: 'Output' },
      fromPort: outPort,
      direction: 'from-source',
    };
    const results = connectableCandidates('', ALL, pending, asValidator);
    // text-source has no Input port -> excluded; uppercase + console-sink have Input.
    expect(results.map(r => r.candidate.value.code).sort()).toEqual(['console-sink', 'uppercase']);
  });

  it('remembers which port on the new node completes the connection', () => {
    const pending: PendingConnection = {
      fromEndpoint: { nodeId: 'n1', portId: 'Output' },
      fromPort: outPort,
      direction: 'from-source',
    };
    const results = connectableCandidates('upper', ALL, pending, asValidator);
    const upper = results.find(r => r.candidate.value.code === 'uppercase');
    expect(upper?.connectPortId).toBe('Input');
  });

  it('handles a dangling target (released from an input): offers nodes with a compatible output', () => {
    const pending: PendingConnection = {
      fromEndpoint: { nodeId: 'n9', portId: 'Input' },
      fromPort: inPort,
      direction: 'from-target',
    };
    const results = connectableCandidates('', ALL, pending, asValidator);
    // Only nodes with an Output port that can feed the dangling Input.
    expect(results.map(r => r.candidate.value.code).sort()).toEqual(['text-source', 'uppercase']);
    const text = results.find(r => r.candidate.value.code === 'text-source');
    expect(text?.connectPortId).toBe('Output');
  });
});
