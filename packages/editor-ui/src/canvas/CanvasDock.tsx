/**
 * `CanvasDock` — the centred, bottom-of-canvas floating toolbar of a creation
 * studio: pointer/pan mode, add-node, and zoom controls, in the black/silver
 * glass language. It replaces React Flow's default corner Controls + MiniMap
 * with one calm, centred dock.
 *
 * Presentation only: it renders buttons and the current zoom %, and calls back
 * to the host for every action. It holds no React Flow or graph state — the host
 * wires the callbacks to `useReactFlow()` (zoom/fit) and the node search (add).
 */

import type { ReactElement } from 'react';
import './CanvasDock.css';

/** Interaction mode the canvas is in — left-drag selects, or left-drag pans. */
export type CanvasMode = 'select' | 'pan';

export interface CanvasDockProps {
  /** Current zoom as a fraction (1 = 100%). */
  readonly zoom: number;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitView: () => void;
  /** Open the node search to add a node. */
  readonly onAdd: () => void;
  /** Current interaction mode + setter (left-drag selects vs pans). */
  readonly mode: CanvasMode;
  readonly onModeChange: (mode: CanvasMode) => void;
  /** Undo/redo — colocated with the canvas tools rather than the top bar. */
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

function CursorIcon(): ReactElement {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 3l6 16 2-6 6-2z" />
    </svg>
  );
}
function HandIcon(): ReactElement {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 12V6a1.5 1.5 0 013 0v5m0-1V5a1.5 1.5 0 013 0v6m0-1V6.5a1.5 1.5 0 013 0V13c0 3.5-2 6-5.5 6H12c-2 0-3-.8-4.2-2.5L5 12.5c-.7-1 .6-2.3 1.6-1.6z" />
    </svg>
  );
}
function PlusIcon(): ReactElement {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function FitIcon(): ReactElement {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}
function UndoIcon(): ReactElement {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-1" />
    </svg>
  );
}
function RedoIcon(): ReactElement {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 7l5 5-5 5M20 12H9a5 5 0 000 10h1" />
    </svg>
  );
}

export function CanvasDock({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAdd,
  mode,
  onModeChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasDockProps): ReactElement {
  const pct = `${String(Math.round(zoom * 100))}%`;
  return (
    <div className="hl-dock" role="toolbar" aria-label="Canvas tools">
      <button
        className="hl-dock-btn"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (⌘Z)"
        aria-label="Undo"
      >
        <UndoIcon />
      </button>
      <button
        className="hl-dock-btn"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (⌘⇧Z)"
        aria-label="Redo"
      >
        <RedoIcon />
      </button>
      <span className="hl-dock-sep" aria-hidden />
      <button
        className={'hl-dock-btn' + (mode === 'select' ? ' is-active' : '')}
        onClick={() => onModeChange('select')}
        title="Select (V)"
        aria-pressed={mode === 'select'}
      >
        <CursorIcon />
      </button>
      <button
        className={'hl-dock-btn' + (mode === 'pan' ? ' is-active' : '')}
        onClick={() => onModeChange('pan')}
        title="Pan (Space)"
        aria-pressed={mode === 'pan'}
      >
        <HandIcon />
      </button>
      <button className="hl-dock-btn hl-dock-add" onClick={onAdd} title="Add node">
        <PlusIcon />
      </button>

      <span className="hl-dock-sep" aria-hidden />

      <button className="hl-dock-btn" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">
        <span className="hl-dock-glyph">−</span>
      </button>
      <button className="hl-dock-zoom hl-mono" onClick={onFitView} title="Fit view">
        {pct}
      </button>
      <button className="hl-dock-btn" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">
        <span className="hl-dock-glyph">+</span>
      </button>
      <button className="hl-dock-btn" onClick={onFitView} title="Fit view" aria-label="Fit view">
        <FitIcon />
      </button>
    </div>
  );
}
