import { describe, it, expect } from 'vitest';
import { createEditorCore } from '../src';
import { SetHiddenCommand, SetLockedCommand } from '../src';

/**
 * hide/lock are view flags, but toggling them must be UNDOABLE — a user who
 * hides the wrong layer expects ⌘Z to bring it back. So the mutation runs as a
 * command through the command service (recorded in history), even though the
 * ViewStateService itself is never serialized into IGraph.
 */
describe('view-state commands', () => {
  it('SetHiddenCommand sets the flag and undo restores it', () => {
    const core = createEditorCore();
    const res = core.commands.execute(new SetHiddenCommand('a', true));
    expect(res.ok).toBe(true);
    expect(core.viewState.isHidden('a')).toBe(true);

    core.history.undo();
    expect(core.viewState.isHidden('a')).toBe(false);

    core.history.redo();
    expect(core.viewState.isHidden('a')).toBe(true);
  });

  it('SetLockedCommand sets the flag and undo restores the PRIOR value', () => {
    const core = createEditorCore();
    core.commands.execute(new SetLockedCommand('a', true));
    expect(core.viewState.isLocked('a')).toBe(true);
    // Toggle off, then undo should return to locked (prior value), not default.
    core.commands.execute(new SetLockedCommand('a', false));
    expect(core.viewState.isLocked('a')).toBe(false);
    core.history.undo();
    expect(core.viewState.isLocked('a')).toBe(true);
  });

  it('emits viewStateChanged on execute and undo', () => {
    const core = createEditorCore();
    let count = 0;
    core.events.on('viewStateChanged', () => (count += 1));
    core.commands.execute(new SetHiddenCommand('a', true));
    core.history.undo();
    expect(count).toBe(2);
  });
});
