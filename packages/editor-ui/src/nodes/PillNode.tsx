/**
 * `PillNode` — the default dressing for a non-asset node: a nover-style capsule.
 *
 * To the runtime this is still an ordinary R/T/W node with ports; editor-ui just
 * dresses it as a rounded pill — a kind-tinted domain dot, the name, and a
 * status dot — with the ports HIDDEN at rest and revealed on hover/selection.
 * The picture, not the plumbing. The verbose port-board (`NodeChrome`) remains
 * available as an "expanded" view for later.
 *
 * Ports reuse `PortRow` (so wiring is identical); the pill styles the handles
 * to ride its left/right edges as small silver dots.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, KeyboardEvent } from 'react';
import type { EditorNode } from '@hlang-org/editor-core';
import { PortRow } from './PortRow';
import { NodeIcon } from '../icons/node-icons';
import { DiagnosticBadge } from '../panels/DiagnosticBadge';
import { useNodeLiveState } from '../live/LiveSignalContext';
import { LivePulse } from '../live/LivePulse';
import { useNodeInteraction } from './NodeInteractionContext';
import './PillNode.css';

/** Max gap (ms) between two clicks on the node name to count as a double-click. */
const DOUBLE_CLICK_MS = 320;

export interface PillNodeChromeProps {
  readonly node: EditorNode;
  readonly selected?: boolean;
}

export function PillNodeChrome({ node, selected }: PillNodeChromeProps): ReactElement {
  const live = useNodeLiveState(node.id);
  const interaction = useNodeInteraction();
  const diagnostic = interaction.diagnosticFor(node.id);

  // Inline rename: double-click the name to edit; Enter/blur commits, Esc cancels.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      setDraft(node.name);
      // Focus + select on next tick so the input exists.
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, node.name]);
  const commit = useCallback((): void => {
    setEditing(false);
    interaction.rename(node.id, draft);
  }, [interaction, node.id, draft]);
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditing(false);
      }
    },
    [commit],
  );

  // React Flow's node-drag pointer handler swallows the browser's native
  // dblclick on a node child, so detect a double-click manually from two rapid
  // clicks (which RF does not block). 320ms window.
  const lastClick = useRef(0);
  const onNameClick = useCallback((): void => {
    const now = performance.now();
    if (now - lastClick.current < DOUBLE_CLICK_MS) {
      setEditing(true);
      lastClick.current = 0;
    } else {
      lastClick.current = now;
    }
  }, []);

  // Data ports only; the error port exists in the model but isn't drawn on the
  // resting pill (advanced affordance — keeps the capsule clean).
  const inputs = node.ports.filter(p => p.direction === 'I' && !p.isError);
  const outputs = node.ports.filter(p => p.direction === 'O' && !p.isError);

  const className = [
    'hl-pill',
    `hl-pill-${node.kind.toLowerCase()}`,
    selected ? 'is-selected' : '',
    live === 'active' ? 'is-active' : '',
    live === 'error' ? 'is-live-error' : '',
    diagnostic?.severity === 'error' ? 'has-diag-error' : '',
    diagnostic?.severity === 'warning' ? 'has-diag-warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} data-kind={node.kind}>
      <LivePulse nodeId={node.id} />
      {/* Domain bead: a kind-tinted disc carrying the node's per-type icon. */}
      <span className="hl-pill-dot" aria-hidden>
        <NodeIcon code={node.code} kind={node.kind} size={13} />
      </span>
      {editing ? (
        <input
          ref={inputRef}
          className="hl-pill-rename nodrag"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          spellCheck={false}
          aria-label="Rename node"
        />
      ) : (
        <span
          className="hl-pill-name"
          onClick={() => {
            // The name covers most of the capsule, so it behaves like the node:
            // the click also reaches React Flow (which selects the node) and a
            // press here drags the node. React Flow swallows the native dblclick
            // on a node child, so a double-click is detected from two rapid
            // clicks; it is the only rename path.
            onNameClick();
          }}
          title="Double-click to rename"
        >
          {node.name}
        </span>
      )}
      {/* Edit-time diagnostic badge (independent of the runtime error channel). */}
      {diagnostic !== undefined && (
        <DiagnosticBadge diagnostic={diagnostic} variant="hl-pill-diag" size={12} />
      )}
      {/* Status dot — lit when the node is active during a run. */}
      <span className="hl-pill-status" aria-hidden />

      {/* Ports ride the capsule edges; hidden until hover/select. */}
      <ul className="hl-pill-ports hl-in">
        {inputs.map(port => (
          <PortRow key={port.id} port={port} />
        ))}
      </ul>
      <ul className="hl-pill-ports hl-out">
        {outputs.map(port => (
          <PortRow key={port.id} port={port} />
        ))}
      </ul>
    </div>
  );
}
