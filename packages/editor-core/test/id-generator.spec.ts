import { describe, it, expect } from 'vitest';
import { CountingIdGenerator } from '../src';

/**
 * After importing a graph whose ids were minted elsewhere (e.g. serialization's
 * `edge-N` scheme), the generator must be told which ids are taken so it never
 * re-issues a colliding id. `reserve` advances the counters past any matching
 * `<prefix>-<n>` id.
 */
describe('CountingIdGenerator.reserve', () => {
  it('advances node/edge counters past existing prefixed ids', () => {
    const gen = new CountingIdGenerator();
    gen.reserve(['node-1', 'node-2', 'edge-1', 'edge-2', 'edge-3']);
    expect(gen.nextNodeId()).toBe('node-3');
    expect(gen.nextEdgeId()).toBe('edge-4');
  });

  it('ignores ids that do not match the prefix scheme', () => {
    const gen = new CountingIdGenerator();
    gen.reserve(['character', 'backdrop', 'weird', 'edge-5']);
    expect(gen.nextNodeId()).toBe('node-1'); // no node-N present
    expect(gen.nextEdgeId()).toBe('edge-6'); // past edge-5
  });

  it('never moves a counter backwards', () => {
    const gen = new CountingIdGenerator();
    gen.nextEdgeId(); // edge-1
    gen.nextEdgeId(); // edge-2
    gen.reserve(['edge-1']); // lower than current — no-op
    expect(gen.nextEdgeId()).toBe('edge-3');
  });
});
