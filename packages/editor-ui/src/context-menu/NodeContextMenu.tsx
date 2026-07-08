/**
 * `NodeContextMenu` — the right-click menu for a node. A black/silver glass
 * panel matching the command palette's material and dismissal, listing actions
 * the consumer supplies (duplicate/copy/cut/paste/delete/hide/lock). Presentation
 * only: each item carries its own `onSelect`; this component owns positioning,
 * keyboard navigation, and dismissal.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode, KeyboardEvent } from 'react';
import type { NodeContextMenuController } from './useNodeContextMenu';
import './NodeContextMenu.css';

const PANEL_WIDTH = 208;
const ITEM_HEIGHT = 34;
/** Keep the menu this many px inside each viewport edge. */
const VIEWPORT_MARGIN = 8;
/** Extra vertical padding added to the estimated menu height. */
const MENU_VPAD = 12;

/** One menu row. A separator is a bare `{ separator: true }`. */
export interface ContextMenuItem {
  readonly id: string;
  readonly label: string;
  /** Optional keyboard-shortcut hint shown right-aligned (e.g. "⌘D"). */
  readonly shortcut?: string;
  /** Optional leading glyph. */
  readonly icon?: ReactNode;
  /** Destructive styling (e.g. Delete). */
  readonly danger?: boolean;
  /** Disabled rows are shown dim and are not selectable. */
  readonly disabled?: boolean;
  readonly onSelect: () => void;
}

export interface NodeContextMenuProps {
  readonly controller: NodeContextMenuController;
  /** Build the items for the targeted node id (recomputed on open). */
  readonly items: (nodeId: string) => readonly ContextMenuItem[];
}

export function NodeContextMenu({ controller, items }: NodeContextMenuProps): ReactElement | null {
  const { state } = controller;
  const [active, setActive] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = state !== undefined;
  useEffect(() => {
    if (isOpen) {
      setActive(0);
      menuRef.current?.focus();
    }
  }, [isOpen]);

  const rows = useMemo(
    () => (state !== undefined ? items(state.nodeId) : []),
    [items, state],
  );

  // Indices that can actually be selected (skip disabled rows).
  const enabledIndices = useMemo(
    () => rows.map((r, i) => (r.disabled ? -1 : i)).filter(i => i >= 0),
    [rows],
  );

  const move = useCallback(
    (delta: number): void => {
      if (enabledIndices.length === 0) {
        return;
      }
      setActive(current => {
        const pos = enabledIndices.indexOf(current);
        const nextPos =
          pos === -1
            ? 0
            : (pos + delta + enabledIndices.length) % enabledIndices.length;
        return enabledIndices[nextPos] ?? current;
      });
    },
    [enabledIndices],
  );

  const choose = useCallback(
    (item: ContextMenuItem | undefined): void => {
      if (item === undefined || item.disabled) {
        return;
      }
      item.onSelect();
      controller.close();
    },
    [controller],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          move(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          move(-1);
          break;
        case 'Enter':
          event.preventDefault();
          choose(rows[active]);
          break;
        case 'Escape':
          event.preventDefault();
          controller.close();
          break;
        default:
          break;
      }
    },
    [move, choose, rows, active, controller],
  );

  if (state === undefined) {
    return null;
  }

  const style = clampToViewport(state.screen.x, state.screen.y, rows.length);

  return (
    <>
      <div
        className="hl-ctx-scrim"
        onPointerDown={() => {
          controller.close();
        }}
        onContextMenu={e => {
          // A right-click on the scrim dismisses rather than opening the OS menu.
          e.preventDefault();
          controller.close();
        }}
      />
      <div
        ref={menuRef}
        className="hl-ctx-menu"
        style={style}
        role="menu"
        aria-label="Node actions"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {rows.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={
              'hl-ctx-item' +
              (item.danger === true ? ' is-danger' : '') +
              (index === active ? ' is-active' : '')
            }
            onPointerEnter={() => !item.disabled && setActive(index)}
            onPointerDown={e => {
              e.preventDefault();
              choose(item);
            }}
          >
            <span className="hl-ctx-item-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="hl-ctx-item-label">{item.label}</span>
            {item.shortcut !== undefined && (
              <span className="hl-ctx-item-key hl-mono">{item.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

/** Keep the menu within the viewport near an edge. */
function clampToViewport(x: number, y: number, rowCount: number): { left: number; top: number } {
  const height = Math.max(ITEM_HEIGHT, rowCount * ITEM_HEIGHT + MENU_VPAD);
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN);
  const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);
  return {
    left: Math.min(Math.max(VIEWPORT_MARGIN, x), maxLeft),
    top: Math.min(Math.max(VIEWPORT_MARGIN, y), maxTop),
  };
}
