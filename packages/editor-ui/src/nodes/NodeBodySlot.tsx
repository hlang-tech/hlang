/**
 * The node-body extension point. In M-UI-1 this renders nothing (generic nodes
 * stay clean R/T/W cards). M-UI-5 wires it to the NodeBodyRegistry so a host
 * (e.g. Prism) can render custom content — image/video previews, inline
 * widgets — per node `code`/`kind` without editor-ui knowing anything about it.
 */

import type { ReactElement, ReactNode } from 'react';
import type { EditorNode } from '@hlang-org/editor-core';

export interface NodeBodySlotProps {
  readonly node: EditorNode;
  /** Custom body content, resolved by the host/registry. Empty renders nothing. */
  readonly children?: ReactNode;
}

export function NodeBodySlot({ children }: NodeBodySlotProps): ReactElement | null {
  if (children === undefined || children === null || children === false) {
    return null;
  }
  return <div className="hl-body">{children}</div>;
}
