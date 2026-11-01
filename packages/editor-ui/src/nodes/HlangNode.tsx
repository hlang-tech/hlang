/**
 * The R/T/W node component. A near-monochrome glass card whose personality
 * comes from a thin kind-tinted signal bar and glowing ports; body content is
 * an extension point (empty for generic nodes). Ports are laid out in two
 * columns — inputs (I) left, outputs (O) right — each Handle anchored to its
 * own row so the `@node/error` port never drifts. W nodes render no error port
 * because their descriptor has none.
 */

import type { ReactElement, ReactNode } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { HlangRFNode } from '@hlang-org/editor-react';
import type { EditorNode } from '@hlang-org/editor-core';
import { KIND_ROLE } from '../tokens/tokens';
import { SignalBar } from './SignalBar';
import { PortRow } from './PortRow';
import { NodeBodySlot } from './NodeBodySlot';
import { useNodeLiveState } from '../live/LiveSignalContext';
import { LivePulse } from '../live/LivePulse';
import { AssetNodeChrome } from './AssetNode';
import { PillNodeChrome } from './PillNode';
import './HlangNode.css';

/** Presentational node chrome, decoupled from React Flow for easy testing. */
export interface NodeChromeProps {
  readonly node: EditorNode;
  readonly selected?: boolean;
  readonly body?: ReactNode;
}

export function NodeChrome({ node, selected, body }: NodeChromeProps): ReactElement {
  const inputs = node.ports.filter(p => p.direction === 'I');
  const outputs = node.ports.filter(p => p.direction === 'O');
  const live = useNodeLiveState(node.id);
  const className = [
    'hl-node',
    `hl-${node.kind.toLowerCase()}`,
    selected ? 'is-selected' : '',
    live === 'active' ? 'is-active' : '',
    live === 'error' ? 'is-live-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} data-kind={node.kind}>
      <LivePulse nodeId={node.id} />
      <SignalBar />
      <header className="hl-head">
        <span className="hl-kind">{node.kind}</span>
        <span className="hl-name">{node.name}</span>
        <span className="hl-role">{KIND_ROLE[node.kind]}</span>
      </header>
      <NodeBodySlot node={node}>{body}</NodeBodySlot>
      <div className="hl-ports">
        <ul className="hl-col hl-in">
          {inputs.map(port => (
            <PortRow key={port.id} port={port} />
          ))}
        </ul>
        <ul className="hl-col hl-out">
          {outputs.map(port => (
            <PortRow key={port.id} port={port} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * The React Flow node component. Reads everything from `data.editorNode`, then
 * DISPATCHES to the right dressing — all in editor-ui, with no change to the
 * runtime (every case is just a node with ports):
 *   - an image asset (params.imageUrl)  → {@link AssetNodeChrome} (framed photo)
 *   - anything else                      → {@link PillNodeChrome} (nover capsule)
 * The verbose port-board {@link NodeChrome} stays available as a future
 * "expanded" view.
 */
export function HlangNode({ data, selected }: NodeProps<HlangRFNode>): ReactElement {
  const node = data.editorNode;
  if (typeof node.params.imageUrl === 'string' && node.params.imageUrl.length > 0) {
    return <AssetNodeChrome node={node} selected={selected} />;
  }
  return <PillNodeChrome node={node} selected={selected} />;
}
