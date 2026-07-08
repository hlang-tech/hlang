/**
 * `NodeSearch` — the floating command palette for creating nodes by fuzzy
 * search. Rendered when the controller is open; anchored at the trigger point.
 *
 * Presentation only: it owns the query string, keyboard navigation, and match
 * highlighting, and delegates ranking + creation to the `NodeSearchController`.
 * Deep-space glass panel, electric-blue accent, kind-tinted result chips.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, KeyboardEvent } from 'react';
import type { NodeKind } from '@hlang-org/editor-core';
import type { NodeSearchController, NodeSearchResultView } from './useNodeSearch';
import type { FuzzyMatch } from './fuzzy';
import './NodeSearch.css';

/** Panel width, used to keep the panel on-screen near the right/bottom edges. */
const PANEL_WIDTH = 320;
const PANEL_MAX_HEIGHT = 360;

export interface NodeSearchProps {
  readonly controller: NodeSearchController;
}

export function NodeSearch({ controller }: NodeSearchProps): ReactElement | null {
  const { state } = controller;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the query and focus the input each time the palette opens.
  const isOpen = state !== undefined;
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const results = useMemo(
    () => (state !== undefined ? controller.results(query) : []),
    [controller, state, query],
  );

  // Keep the active index within bounds as results shrink/grow.
  const clampedActive = results.length === 0 ? 0 : Math.min(active, results.length - 1);

  const choose = useCallback(
    (view: NodeSearchResultView | undefined): void => {
      if (view !== undefined) {
        controller.commit(view);
      }
    },
    [controller],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActive(i => (results.length === 0 ? 0 : (i + 1) % results.length));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActive(i => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
          break;
        case 'Enter':
          event.preventDefault();
          choose(results[clampedActive]);
          break;
        case 'Escape':
          event.preventDefault();
          controller.close();
          break;
        default:
          break;
      }
    },
    [results, clampedActive, choose, controller],
  );

  if (state === undefined) {
    return null;
  }

  const style = clampToViewport(state.screen.x, state.screen.y);
  const connectMode = state.pending !== undefined;

  return (
    <>
      <div
        className="hl-node-search-scrim"
        onPointerDown={() => {
          controller.close();
        }}
      />
      <div className="hl-node-search" style={style} role="dialog" aria-label="Create node">
        <div className="hl-node-search-field">
          <span className="hl-node-search-glyph" aria-hidden>
            {connectMode ? '⤳' : '＋'}
          </span>
          <input
            ref={inputRef}
            className="hl-node-search-input"
            value={query}
            placeholder={connectMode ? 'connect to…' : 'search nodes…'}
            onChange={e => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            aria-label="Search nodes"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <ul className="hl-node-search-list" role="listbox">
          {results.length === 0 && (
            <li className="hl-node-search-empty hl-mono">no matching nodes</li>
          )}
          {results.map((view, index) => {
            const descriptor = view.result.value;
            const kind = descriptor.kind;
            return (
              <li
                key={descriptor.code}
                role="option"
                aria-selected={index === clampedActive}
                className={
                  'hl-node-search-item' + (index === clampedActive ? ' is-active' : '')
                }
                onPointerEnter={() => setActive(index)}
                onPointerDown={e => {
                  e.preventDefault();
                  choose(view);
                }}
              >
                <span
                  className={`hl-node-search-kind hl-mono hl-kind-${kind.toLowerCase() as Lowercase<NodeKind>}`}
                >
                  {kind}
                </span>
                <span className="hl-node-search-label">
                  {highlight(descriptor.displayName, view.result.match)}
                </span>
                {view.connectPortId !== undefined && (
                  <span className="hl-node-search-port hl-mono">{view.connectPortId}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

/** Render a label with the fuzzy-matched characters emphasized. */
function highlight(text: string, match: FuzzyMatch): readonly ReactElement[] {
  const hit = new Set(match.positions);
  const chars = Array.from(text);
  return chars.map((ch, i) =>
    hit.has(i) ? (
      <mark key={i} className="hl-node-search-hit">
        {ch}
      </mark>
    ) : (
      <span key={i}>{ch}</span>
    ),
  );
}

/** Keep the panel within the viewport when opened near an edge. */
function clampToViewport(x: number, y: number): { left: number; top: number } {
  const maxLeft = Math.max(8, window.innerWidth - PANEL_WIDTH - 8);
  const maxTop = Math.max(8, window.innerHeight - PANEL_MAX_HEIGHT - 8);
  return {
    left: Math.min(Math.max(8, x), maxLeft),
    top: Math.min(Math.max(8, y), maxTop),
  };
}
