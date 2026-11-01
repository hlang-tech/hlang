/**
 * @vitest-environment jsdom
 *
 * Behavior test for the editor's keyboard shortcuts against a REAL editor core.
 * The key concern is embedding: when the editor is one part of a larger page, a
 * shortcut pressed elsewhere on the page (copying text with ⌘C, pressing
 * Backspace in a page control) must reach the page, not the canvas. The
 * optional `scope` restricts the shortcuts to keystrokes from inside the editor.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { createEditorCore, AddNodeCommand } from '@hlang-org/editor-core';
import type { EditorCore, NodeDescriptor, PortDescriptor } from '@hlang-org/editor-core';
import { useEditorHotkeys } from './useEditorHotkeys';

// Testing Library unmounts after each test only through an explicit cleanup
// when the test API is imported rather than global.
afterEach(cleanup);

const dto = { name: 'DTO', kind: 'interface' as const };
const outPort = (): PortDescriptor => ({ id: 'Output', direction: 'O', name: 'Output', dataType: dto, isError: false });
const errPort = (): PortDescriptor => ({ id: '@node/error', direction: 'O', name: 'error', dataType: dto, isError: true });

const R: NodeDescriptor = {
  code: 'text-source', kind: 'R', displayName: 'Text Source', group: 'input',
  ports: [outPort(), errPort()], defaultParams: {}, runtimeResource: '@t/r@1',
};

function coreWithNodes(count: number): EditorCore {
  const core = createEditorCore();
  core.registry.register(R);
  for (let index = 0; index < count; index += 1) {
    core.commands.execute(new AddNodeCommand(core.registry.createNode('text-source', { x: index * 100, y: 0 })));
  }
  core.selection.clear();
  return core;
}

/** Dispatch a keydown from `target` and report whether the hook claimed it. */
function press(target: HTMLElement, init: KeyboardEventInit): boolean {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('useEditorHotkeys', () => {
  let inside: HTMLElement;
  let outside: HTMLElement;

  beforeEach(() => {
    inside = document.createElement('div');
    outside = document.createElement('div');
    document.body.append(inside, outside);
  });

  afterEach(() => {
    inside.remove();
    outside.remove();
  });

  it('without a scope, handles shortcuts from anywhere on the page', () => {
    const core = coreWithNodes(2);
    renderHook(() => { useEditorHotkeys(core); });

    expect(press(outside, { key: 'a', ctrlKey: true })).toBe(true);
    expect(core.selection.getSelectedNodes().size).toBe(2);
  });

  it('with a scope, handles shortcuts from inside the editor', () => {
    const core = coreWithNodes(2);
    renderHook(() => { useEditorHotkeys(core, { scope: { current: inside } }); });

    expect(press(inside, { key: 'a', ctrlKey: true })).toBe(true);
    expect(core.selection.getSelectedNodes().size).toBe(2);
  });

  it('with a scope, leaves shortcuts from the rest of the page to the page', () => {
    const core = coreWithNodes(2);
    renderHook(() => { useEditorHotkeys(core, { scope: { current: inside } }); });

    expect(press(outside, { key: 'a', ctrlKey: true })).toBe(false);
    expect(press(outside, { key: 'c', metaKey: true })).toBe(false);
    expect(core.selection.getSelectedNodes().size).toBe(0);
  });

  it('with a scope, does not delete the selection on a Backspace from outside', () => {
    const core = coreWithNodes(2);
    renderHook(() => { useEditorHotkeys(core, { scope: { current: inside } }); });
    core.selection.selectNodes(core.model.getNodes().map(node => node.id), 'replace');

    expect(press(outside, { key: 'Backspace' })).toBe(false);
    expect(core.model.getNodes()).toHaveLength(2);

    expect(press(inside, { key: 'Backspace' })).toBe(true);
    expect(core.model.getNodes()).toHaveLength(0);
  });

  it('with a scope that is not mounted yet, handles nothing', () => {
    const core = coreWithNodes(1);
    renderHook(() => { useEditorHotkeys(core, { scope: { current: null } }); });

    expect(press(outside, { key: 'a', ctrlKey: true })).toBe(false);
    expect(core.selection.getSelectedNodes().size).toBe(0);
  });
});
