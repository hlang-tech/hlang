/**
 * `Cheatsheet` — a keyboard-shortcut reference in the black/silver glass
 * language. Toggled by the host (typically the `?` key). Presentation only: it
 * takes an `open` flag and an `onClose`, and renders a grouped list of the
 * editor's shortcuts so they are discoverable, not memorized.
 */

import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import './Cheatsheet.css';

export interface ShortcutRow {
  readonly keys: string;
  readonly label: string;
}
export interface ShortcutGroup {
  readonly title: string;
  readonly rows: readonly ShortcutRow[];
}

export interface CheatsheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Groups to display; a sensible default set is used when omitted. */
  readonly groups?: readonly ShortcutGroup[];
}

const DEFAULT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Edit',
    rows: [
      { keys: '⌘Z', label: 'Undo' },
      { keys: '⌘⇧Z / ⌘Y', label: 'Redo' },
      { keys: '⌘C', label: 'Copy' },
      { keys: '⌘X', label: 'Cut' },
      { keys: '⌘V', label: 'Paste (at cursor)' },
      { keys: '⌘D', label: 'Duplicate' },
      { keys: '⌫', label: 'Delete' },
    ],
  },
  {
    title: 'Select & navigate',
    rows: [
      { keys: '⌘A', label: 'Select all' },
      { keys: 'Drag', label: 'Box-select (left drag)' },
      { keys: 'Middle / Right drag', label: 'Pan' },
      { keys: 'Space + drag', label: 'Pan' },
      { keys: 'Double-click name', label: 'Rename node' },
    ],
  },
  {
    title: 'Build',
    rows: [
      { keys: 'Double-click canvas', label: 'Search & create node' },
      { keys: 'Drag port to empty', label: 'Create & connect' },
      { keys: 'Drop node on wire', label: 'Insert inline (if compatible)' },
      { keys: 'Drag edge end', label: 'Reconnect' },
      { keys: '?', label: 'This cheatsheet' },
    ],
  },
];

export function Cheatsheet({ open, onClose, groups = DEFAULT_GROUPS }: CheatsheetProps): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    // Move focus into the dialog on open (a11y — keyboard/SR users get an anchor,
    // matching the NodeContextMenu pattern).
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return (): void => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="hl-cheat-scrim" onPointerDown={onClose} />
      <div
        ref={dialogRef}
        className="hl-cheat"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
      >
        <div className="hl-cheat-head">
          <span className="hl-cheat-title">Shortcuts</span>
          <button className="hl-cheat-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="hl-cheat-grid">
          {groups.map(group => (
            <section key={group.title} className="hl-cheat-group">
              <h3 className="hl-cheat-group-title hl-mono">{group.title}</h3>
              <ul className="hl-cheat-rows">
                {group.rows.map(row => (
                  // A row is a binding: one action can have several (two ways to pan),
                  // so neither the label nor the keys alone identify it.
                  <li key={`${row.keys}\u0000${row.label}`} className="hl-cheat-row">
                    <span className="hl-cheat-label">{row.label}</span>
                    <kbd className="hl-cheat-keys hl-mono">{row.keys}</kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
