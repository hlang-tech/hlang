/**
 * `AssetNode` — a source node dressed as a real image asset.
 *
 * Architecturally this is just an R node: to the runtime it has output ports and
 * emits its image (its `params.imageUrl`). editor-ui is free to DRESS it as a
 * framed photograph — a frosted-glass card whose hero is the image itself — with
 * no change to the input/output contract. This is the layering: the bottom is an
 * input→output DAG; this layer decides what the node looks like.
 *
 * Ports are reused verbatim (PortRow → React Flow Handle), so wiring behaves
 * exactly like any other node; the output handle rides the image's right edge.
 */

import type { ReactElement } from 'react';
import type { EditorNode } from '@hlang-org/editor-core';
import { PortRow } from './PortRow';
import { useNodeLiveState } from '../live/LiveSignalContext';
import { LivePulse } from '../live/LivePulse';
import './AssetNode.css';

export interface AssetNodeChromeProps {
  readonly node: EditorNode;
  readonly selected?: boolean;
}

/** Read a string param, or undefined. */
function stringParam(node: EditorNode, key: string): string | undefined {
  const v = node.params[key];
  return typeof v === 'string' ? v : undefined;
}

export function AssetNodeChrome({ node, selected }: AssetNodeChromeProps): ReactElement {
  const imageUrl = stringParam(node, 'imageUrl') ?? '';
  const caption = stringParam(node, 'caption') ?? node.name;
  const role = stringParam(node, 'role'); // optional semantic role (e.g. Character)
  const live = useNodeLiveState(node.id);
  // An asset is a clean source: expose only its data output(s). The `@node/error`
  // port still exists in the model, but drawing it on the photo would be visual
  // clutter (nover hides plumbing) — error wiring is an advanced affordance.
  const outputs = node.ports.filter(p => p.direction === 'O' && !p.isError);

  const className = [
    'hl-asset',
    selected ? 'is-selected' : '',
    live === 'active' ? 'is-active' : '',
    live === 'error' ? 'is-live-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} data-kind={node.kind}>
      <LivePulse nodeId={node.id} />
      <div className="hl-asset-frame">
        {imageUrl.length > 0 ? (
          <img className="hl-asset-img" src={imageUrl} alt={caption} draggable={false} />
        ) : (
          <div className="hl-asset-placeholder" aria-hidden />
        )}
        <div className="hl-asset-scrim" />
        <div className="hl-asset-caption">
          <span className="hl-asset-name">{caption}</span>
          {role !== undefined && <span className="hl-asset-role hl-mono">{role}</span>}
        </div>
      </div>
      {/* Output ports ride the right edge; hidden until hover/select via CSS. */}
      <ul className="hl-asset-ports">
        {outputs.map(port => (
          <PortRow key={port.id} port={port} />
        ))}
      </ul>
    </div>
  );
}
