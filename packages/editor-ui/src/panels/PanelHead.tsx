/**
 * `PanelHead` and `PanelAction` — the header row of a docked panel (the
 * console, the run log): what the panel is, a short status, and its actions.
 *
 * The header responds to its own width, not the window's (a container query,
 * as VS Code's and DevTools' panel toolbars do): when it is narrow the actions
 * drop their labels and keep their icons, and then the status gives way. A
 * label that is not shown is still the button's accessible name, and its
 * tooltip.
 */

import type { ReactElement, ReactNode } from 'react';
import './PanelHead.css';

export interface PanelHeadProps {
  /** What the panel is: its title, or the host's tabs. */
  readonly leading: ReactNode;
  /** A short status after it, e.g. a count; the first thing to go when the panel is narrow. */
  readonly meta?: ReactNode;
  /** The panel's actions, usually `PanelAction`s. */
  readonly children?: ReactNode;
}

export function PanelHead({ leading, meta, children }: PanelHeadProps): ReactElement {
  return (
    <header className="hl-panel-head">
      {leading}
      {meta === undefined ? null : <span className="hl-panel-meta hl-mono">{meta}</span>}
      {children === undefined ? null : <span className="hl-panel-actions">{children}</span>}
    </header>
  );
}

export interface PanelActionProps {
  readonly icon: ReactNode;
  /** The action's name: shown when there is room, and always its accessible name. */
  readonly label: string;
  readonly onClick: () => void;
  /** For a toggle: whether it is on. Leave out for a plain action. */
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  /** The tooltip; the label by default. */
  readonly title?: string;
}

export function PanelAction({ icon, label, onClick, pressed, disabled = false, title }: PanelActionProps): ReactElement {
  return (
    <button
      type="button"
      className={`hl-panel-action${pressed === true ? ' is-on' : ''}`}
      aria-pressed={pressed}
      disabled={disabled}
      title={title ?? label}
      onClick={onClick}
    >
      <span className="hl-panel-action-icon" aria-hidden>
        {icon}
      </span>
      <span className="hl-panel-action-label">{label}</span>
    </button>
  );
}
