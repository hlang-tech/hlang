/**
 * `InspectorPanel` — the right-hand property inspector. It follows selection:
 * with exactly one node selected it shows that node's identity plus a
 * schema-driven parameter form (edits commit undoable UpdateParamsCommands);
 * otherwise it shows an empty/summary state. This is the unified control center
 * (nover.studio's model) over hlang's headless core.
 */

import type { ReactElement, ReactNode } from 'react';
import type { EditorCore } from '@hlang-org/editor-core';
import { useSelection } from '@hlang-org/editor-react';
import { KIND_ROLE } from '../tokens/tokens';
import { deriveParamSchema } from '../schema/param-field';
import { useNodeParams } from '../hooks/useNodeParams';
import { ParamForm } from './ParamForm';
import './InspectorPanel.css';

export interface InspectorPanelProps {
  readonly core: EditorCore;
  /** Shown when no single node is selected. */
  readonly emptyState?: ReactNode;
}

export function InspectorPanel({ core, emptyState }: InspectorPanelProps): ReactElement {
  const selection = useSelection(core);
  const selectedNodes = selection.selectedNodes;
  const singleId = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
  const params = useNodeParams(core, singleId);
  const node = params.node;

  if (node === undefined) {
    return (
      <div className="hl-inspector hl-inspector-empty">
        {emptyState ?? (
          <div className="hl-inspector-blank">
            <span className="hl-inspector-blank-badge" aria-hidden />
            <p className="hl-inspector-blank-title">
              {selectedNodes.length > 1 ? `${String(selectedNodes.length)} nodes selected` : 'Nothing selected'}
            </p>
            <p className="hl-inspector-hint">
              {selectedNodes.length > 1
                ? 'Select a single node to edit its parameters.'
                : 'Pick a node on the canvas or in the outline to inspect and tune it.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  const descriptor = core.registry.get(node.code);
  const fields = descriptor === undefined ? [] : deriveParamSchema(descriptor, node);
  const imageUrl =
    typeof node.params.imageUrl === 'string' && node.params.imageUrl.length > 0
      ? node.params.imageUrl
      : undefined;

  return (
    <div className="hl-inspector">
      {/* A preview thumbnail grounds the header: the asset's image, or a
          kind-tinted medallion for other nodes. */}
      <div className={`hl-inspector-preview hl-${node.kind.toLowerCase()}`}>
        {imageUrl !== undefined ? (
          <img className="hl-inspector-preview-img" src={imageUrl} alt={node.name} />
        ) : (
          <span className="hl-inspector-preview-badge hl-mono">{node.kind}</span>
        )}
      </div>
      <header className="hl-inspector-head">
        <span className={`hl-inspector-kind hl-${node.kind.toLowerCase()}`}>{node.kind}</span>
        <div className="hl-inspector-titles">
          <span className="hl-inspector-name">{node.name}</span>
          <span className="hl-inspector-role hl-mono">
            {node.code} · {KIND_ROLE[node.kind]}
          </span>
        </div>
      </header>

      <section className="hl-inspector-section">
        <h3 className="hl-inspector-section-title">Parameters</h3>
        {fields.length === 0 ? (
          <p className="hl-inspector-hint">This node has no parameters.</p>
        ) : (
          <ParamForm
            fields={fields}
            onCommit={(key, value) => params.setParam(key, value)}
          />
        )}
      </section>

      <section className="hl-inspector-section">
        <h3 className="hl-inspector-section-title">Ports</h3>
        <ul className="hl-inspector-ports">
          {node.ports.map(port => (
            <li
              key={port.id}
              className={`hl-inspector-port${port.isError ? ' is-error' : ''}`}
            >
              <span className={`hl-port-dot hl-dir-${port.direction.toLowerCase()}`} />
              <span className="hl-mono">{port.name}</span>
              <span className="hl-inspector-port-dir hl-mono">{port.direction}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
