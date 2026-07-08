/**
 * `useEditorHotkeys` — global keyboard shortcuts for the editor canvas:
 *
 *   ⌘/Ctrl+Z         undo       ⌘/Ctrl+Shift+Z, ⌘/Ctrl+Y  redo
 *   ⌘/Ctrl+C  copy   ⌘/Ctrl+V  paste   ⌘/Ctrl+X  cut   ⌘/Ctrl+D  duplicate
 *   Delete / Backspace  delete
 *
 * Clipboard actions run through `useClipboard`; undo/redo drive the history
 * service. Every action is a proper command, so it is itself undoable. The
 * listener is on `window` but SUPPRESSED while a text input / textarea /
 * contenteditable is focused, so typing never triggers a canvas action.
 */

import { useEffect } from 'react';
import type { EditorCore } from '@hlang-org/editor-core';
import { useClipboard } from '@hlang-org/editor-react';

/** True when focus is in an editable field, where shortcuts must NOT fire. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function useEditorHotkeys(core: EditorCore): void {
  const clipboard = useClipboard(core);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) {
        return;
      }
      const mod = event.metaKey || event.ctrlKey;

      // Undo / redo. Redo accepts ⌘⇧Z (Mac) and ⌘Y (Windows) conventions.
      if (mod && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault();
          core.history.undo();
          return;
        }
        if ((key === 'z' && event.shiftKey) || key === 'y') {
          event.preventDefault();
          core.history.redo();
          return;
        }
      }

      if (mod && !event.shiftKey && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === 'c') {
          event.preventDefault();
          clipboard.copy();
          return;
        }
        if (key === 'x') {
          event.preventDefault();
          clipboard.cut();
          return;
        }
        if (key === 'v') {
          event.preventDefault();
          clipboard.paste();
          return;
        }
        if (key === 'd') {
          event.preventDefault();
          clipboard.duplicate();
          return;
        }
        if (key === 'a') {
          // Select all nodes. Going through core.selection reflects onto the
          // canvas via the derived `selected` flag + selectionChanged reconcile.
          event.preventDefault();
          core.selection.selectNodes(
            core.model.getNodes().map(n => n.id),
            'replace',
          );
          return;
        }
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        clipboard.remove();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return (): void => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [core, clipboard]);
}
