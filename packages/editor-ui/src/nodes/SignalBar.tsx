/**
 * The thin, kind-tinted bar across the top of a node — the node's kind
 * expressed with restraint (no large color fills). Reads `--hl-kind` set by the
 * node's kind class.
 */

import type { ReactElement } from 'react';

export function SignalBar(): ReactElement {
  return <div className="hl-signal" aria-hidden="true" />;
}
