import { describe, it, expect } from 'vitest';
import { createEditorCore } from '../src';

/**
 * ViewStateService tracks per-node, editor-only view flags — `hidden` and
 * `locked` — that are NEVER serialized into IGraph. It mirrors SelectionService:
 * in-memory sets, event-on-mutate, queryable, surviving model edits.
 */
describe('ViewStateService', () => {
  it('tracks hidden per node, defaulting to false', () => {
    const core = createEditorCore();
    expect(core.viewState.isHidden('a')).toBe(false);
    core.viewState.setHidden('a', true);
    expect(core.viewState.isHidden('a')).toBe(true);
    expect([...core.viewState.getHiddenNodes()]).toEqual(['a']);
  });

  it('tracks locked per node, defaulting to false', () => {
    const core = createEditorCore();
    expect(core.viewState.isLocked('a')).toBe(false);
    core.viewState.setLocked('a', true);
    expect(core.viewState.isLocked('a')).toBe(true);
    expect([...core.viewState.getLockedNodes()]).toEqual(['a']);
  });

  it('hidden and locked are independent flags on the same node', () => {
    const core = createEditorCore();
    core.viewState.setHidden('a', true);
    expect(core.viewState.isHidden('a')).toBe(true);
    expect(core.viewState.isLocked('a')).toBe(false);
    core.viewState.setLocked('a', true);
    core.viewState.setHidden('a', false);
    expect(core.viewState.isHidden('a')).toBe(false);
    expect(core.viewState.isLocked('a')).toBe(true);
  });

  it('setting a flag to its current value is idempotent (no duplicate entries)', () => {
    const core = createEditorCore();
    core.viewState.setHidden('a', true);
    core.viewState.setHidden('a', true);
    expect([...core.viewState.getHiddenNodes()]).toEqual(['a']);
    core.viewState.setHidden('a', false);
    core.viewState.setHidden('a', false);
    expect([...core.viewState.getHiddenNodes()]).toEqual([]);
  });

  it('emits viewStateChanged on every mutation', () => {
    const core = createEditorCore();
    let count = 0;
    core.events.on('viewStateChanged', () => (count += 1));
    core.viewState.setHidden('a', true);
    core.viewState.setLocked('a', true);
    core.viewState.setHidden('a', false);
    expect(count).toBe(3);
  });

  it('does not emit when a flag value is unchanged', () => {
    const core = createEditorCore();
    let count = 0;
    core.events.on('viewStateChanged', () => (count += 1));
    core.viewState.setHidden('a', false); // already false
    core.viewState.setHidden('a', true);
    core.viewState.setHidden('a', true); // already true
    expect(count).toBe(1);
  });

  it('clear() resets both sets and emits once', () => {
    const core = createEditorCore();
    core.viewState.setHidden('a', true);
    core.viewState.setLocked('b', true);
    let count = 0;
    core.events.on('viewStateChanged', () => (count += 1));
    core.viewState.clear();
    expect([...core.viewState.getHiddenNodes()]).toEqual([]);
    expect([...core.viewState.getLockedNodes()]).toEqual([]);
    expect(count).toBe(1);
  });
});
