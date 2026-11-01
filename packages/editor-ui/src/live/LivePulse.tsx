/**
 * `LivePulse` — one flash on a node each time it runs during a live run. The
 * pulse count from the live store keys the element, so every new count
 * mounts a fresh element and its CSS animation plays once: the node flashes
 * exactly as often as it actually ran (per frame at most). Place it as the
 * first child of a node's rounded, positioned root.
 */

import type { ReactElement } from 'react';
import { useNodePulse } from './LiveSignalContext';

export function LivePulse({ nodeId }: { readonly nodeId: string }): ReactElement | null {
  const pulse = useNodePulse(nodeId);
  return pulse === 0 ? null : <span key={pulse} className="hl-live-pulse" aria-hidden="true" />;
}
