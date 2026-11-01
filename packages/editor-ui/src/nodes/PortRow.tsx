/**
 * A single port row: a React Flow `Handle` anchored to this row (so it centers
 * on its own label, never drifting) plus the port's mono label. Renders the
 * live/value distinction (filled vs hollow handle) and the error hue.
 */

import type { ReactElement } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { PortDescriptor } from '@hlang-org/editor-core';

export interface PortRowProps {
  readonly port: PortDescriptor;
}

export function PortRow({ port }: PortRowProps): ReactElement {
  const isInput = port.direction === 'I';
  const side = isInput ? 'target' : 'source';
  // Ports are RxJS streams by default; a `value` port only emits on change.
  const isLive = port.stream !== 'value';
  const rowClass = `hl-port${port.isError ? ' is-error' : ''}`;
  const handleClass = `hl-handle${isLive ? ' is-live' : ''}`;

  return (
    <li className={rowClass}>
      <Handle
        type={side}
        position={isInput ? Position.Left : Position.Right}
        id={port.id}
        className={handleClass}
        isConnectable
      />
      <span className="hl-port-label">{port.isError ? 'error' : port.name}</span>
    </li>
  );
}
