/**
 * The top toolbar: a thin glass bar with a brand wordmark on the left and an
 * action cluster on the right. `Toolbar` is the presentational container;
 * `UndoRedo` and `RunButton` are the standard actions wired to editor-core via
 * editor-react hooks. Hosts may pass extra actions through `actions`.
 */

import type { ReactElement, ReactNode } from 'react';
import type { EditorCore } from '@hlang-org/editor-core';
import { useHistory } from '@hlang-org/editor-react';
import './Toolbar.css';

export interface ToolbarProps {
  /** Brand/title shown on the left. Defaults to a generic wordmark. */
  readonly title?: ReactNode;
  /** Centre slot — a tool cluster (add/frame/view), absolutely centred. */
  readonly center?: ReactNode;
  /** Action nodes rendered on the right (e.g. <UndoRedo/>, <RunButton/>). */
  readonly actions?: ReactNode;
}

export function Toolbar({ title, center, actions }: ToolbarProps): ReactElement {
  return (
    <header className="hl-toolbar">
      <div className="hl-toolbar-brand">
        {title ?? (
          <>
            <span className="hl-toolbar-glyph" aria-hidden="true" />
            <span className="hl-toolbar-wordmark">hlang</span>
          </>
        )}
      </div>
      {center !== undefined && <div className="hl-toolbar-center">{center}</div>}
      <div className="hl-toolbar-actions">{actions}</div>
    </header>
  );
}

export interface UndoRedoProps {
  readonly core: EditorCore;
}

export function UndoRedo({ core }: UndoRedoProps): ReactElement {
  const history = useHistory(core);
  return (
    <>
      <button
        type="button"
        className="hl-toolbar-btn"
        onClick={() => history.undo()}
        disabled={!history.canUndo}
        title="Undo (⌘Z)"
      >
        Undo
      </button>
      <button
        type="button"
        className="hl-toolbar-btn"
        onClick={() => history.redo()}
        disabled={!history.canRedo}
        title="Redo (⌘⇧Z)"
      >
        Redo
      </button>
    </>
  );
}

export interface RunButtonProps {
  /**
   * Invoked when clicked. This is a toggle: when `running` is true the button
   * shows a Stop affordance, and the host is expected to stop the execution.
   */
  readonly onRun: () => void;
  /** Whether an execution is currently in progress. */
  readonly running?: boolean;
  readonly runLabel?: string;
  readonly stopLabel?: string;
}

export function RunButton({
  onRun,
  running = false,
  runLabel = 'Run',
  stopLabel = 'Stop',
}: RunButtonProps): ReactElement {
  return (
    <button
      type="button"
      className={`hl-toolbar-btn hl-toolbar-run${running ? ' is-running' : ''}`}
      onClick={onRun}
      aria-pressed={running}
    >
      <span
        className={`hl-toolbar-run-icon${running ? ' is-stop' : ''}`}
        aria-hidden="true"
      />
      {running ? stopLabel : runLabel}
    </button>
  );
}

/** A compact read-only stat pill (e.g. a node/vertex count) for the top bar. */
export function ToolbarStat({ label, value }: { readonly label?: string; readonly value: ReactNode }): ReactElement {
  return (
    <span className="hl-toolbar-stat hl-mono" title={label}>
      {value}
    </span>
  );
}

/** A secondary ghost button for the top bar (e.g. Invite). Presentational. */
export function ToolbarGhostButton({
  children,
  onClick,
  title,
}: {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly title?: string;
}): ReactElement {
  return (
    <button type="button" className="hl-toolbar-btn" onClick={onClick} title={title}>
      {children}
    </button>
  );
}
