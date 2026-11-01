/**
 * `ReadOnlyBadge` — says, in the toolbar, that the graph can be looked at
 * and run but not changed (the editor core is read-only; see editor-core's
 * `IEditorModeService`). The host says why in `title`. In a narrow toolbar it
 * keeps only its lock; the label stays its accessible name.
 */

import type { ReactElement } from 'react';
import { LockIcon } from '../icons/node-icons';
import './ReadOnlyBadge.css';

export interface ReadOnlyBadgeProps {
  /** The badge's text. */
  readonly label?: string;
  /** Why the editor is read-only, shown as its tooltip. */
  readonly title?: string;
}

export function ReadOnlyBadge({ label = 'View only', title }: ReadOnlyBadgeProps): ReactElement {
  return (
    <span className="hl-readonly-badge" title={title ?? label}>
      <LockIcon size={12} />
      <span className="hl-readonly-badge-label">{label}</span>
    </span>
  );
}
