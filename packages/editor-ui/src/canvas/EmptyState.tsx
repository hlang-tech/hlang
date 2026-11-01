/**
 * `EmptyState` — a quiet, centered hint shown over an empty canvas. Purely
 * presentational; the host decides when to render it (e.g. when the graph has
 * no nodes). Non-interactive so it never blocks canvas gestures.
 */

import type { ReactElement, ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  readonly title?: ReactNode;
  readonly hint?: ReactNode;
}

export function EmptyState({
  title = 'An empty canvas.',
  hint = 'add a source · wire it to a sink · run',
}: EmptyStateProps): ReactElement {
  return (
    <div className="hl-empty" aria-hidden="true">
      <p className="hl-empty-title">{title}</p>
      <p className="hl-empty-hint">{hint}</p>
    </div>
  );
}
