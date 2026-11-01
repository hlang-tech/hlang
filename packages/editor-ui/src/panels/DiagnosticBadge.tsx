/**
 * `DiagnosticBadge` — a single edit-time diagnostic marker (error/warning icon +
 * tooltip), shared by the node chrome and the outline so the severity→icon and
 * severity→class mapping lives in ONE place. `variant` only sets the wrapper
 * class prefix so each host can size/position it via its own CSS.
 */

import type { ReactElement } from 'react';
import type { Diagnostic } from '@hlang-org/editor-core';
import { ErrorIcon, WarningIcon } from '../icons/node-icons';

export interface DiagnosticBadgeProps {
  readonly diagnostic: Diagnostic;
  /** Class-prefix so hosts style it in context (e.g. 'hl-pill-diag'). */
  readonly variant: string;
  readonly size?: number;
}

export function DiagnosticBadge({ diagnostic, variant, size = 12 }: DiagnosticBadgeProps): ReactElement {
  return (
    <span
      className={`${variant} hl-diag-${diagnostic.severity}`}
      title={diagnostic.message}
      aria-label={`${diagnostic.severity}: ${diagnostic.message}`}
    >
      {diagnostic.severity === 'error' ? <ErrorIcon size={size} /> : <WarningIcon size={size} />}
    </span>
  );
}
