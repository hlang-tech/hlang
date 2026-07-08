/**
 * `EditorShell` — composes the editor's regions (top toolbar, left panel,
 * center canvas, right inspector) as a CSS grid. It holds NO graph logic; a
 * host slots children into named regions. Left/right panels are collapsible via
 * UI-only props (collapse state is presentation, never part of the graph).
 */

import type { ReactElement, ReactNode } from 'react';
import './EditorShell.css';

export interface EditorShellProps {
  /** Top toolbar region. */
  readonly toolbar?: ReactNode;
  /** Left region (node palette / outline). */
  readonly left?: ReactNode;
  /** Right region (inspector). */
  readonly right?: ReactNode;
  /** Center region — required; the host renders <ReactFlow> + <CanvasChrome>. */
  readonly canvas: ReactNode;
  /** Optional footer region (e.g. an output/console strip). */
  readonly footer?: ReactNode;
  readonly leftCollapsed?: boolean;
  readonly rightCollapsed?: boolean;
}

export function EditorShell({
  toolbar,
  left,
  right,
  canvas,
  footer,
  leftCollapsed = false,
  rightCollapsed = false,
}: EditorShellProps): ReactElement {
  const className = [
    'hl-shell',
    leftCollapsed ? 'hl-left-collapsed' : '',
    rightCollapsed ? 'hl-right-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {toolbar !== undefined && <div className="hl-region-toolbar">{toolbar}</div>}
      <div className="hl-region-body">
        {left !== undefined && !leftCollapsed && (
          <aside className="hl-region-left">{left}</aside>
        )}
        <main className="hl-region-canvas">{canvas}</main>
        {right !== undefined && !rightCollapsed && (
          <aside className="hl-region-right">{right}</aside>
        )}
      </div>
      {footer !== undefined && <div className="hl-region-footer">{footer}</div>}
    </div>
  );
}
