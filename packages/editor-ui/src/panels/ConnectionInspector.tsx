/**
 * `ConnectionInspector` — the inspector for one selected connection: where it
 * runs from and to, and its back-pressure (RFC 0001): whether it is bounded,
 * its capacity, and whether a full connection drops its oldest message.
 * Changes are undoable commands.
 */

import type { ReactElement } from 'react';
import type { EdgeId, EditorCore, Endpoint } from '@hlang-org/editor-core';
import { boundsFields, nextBounds } from '../edges/edge-bounds';
import { useEdgeBounds } from '../hooks/useEdgeBounds';
import { ParamForm } from './ParamForm';

export function ConnectionInspector({ core, edgeId }: { readonly core: EditorCore; readonly edgeId: EdgeId }): ReactElement | null {
  const { edge, setBounds } = useEdgeBounds(core, edgeId);
  if (edge === undefined) {
    return null;
  }
  const end = (endpoint: Endpoint): string => `${core.model.getNode(endpoint.nodeId)?.name ?? endpoint.nodeId}.${endpoint.portId}`;
  return (
    <div className="hl-inspector">
      <header className="hl-inspector-head">
        <span className="hl-inspector-kind hl-connection">→</span>
        <div className="hl-inspector-titles">
          <span className="hl-inspector-name">Connection</span>
          <span className="hl-inspector-role hl-mono">
            {end(edge.source)} → {end(edge.target)}
          </span>
        </div>
      </header>
      <section className="hl-inspector-section">
        <h3 className="hl-inspector-section-title">Back-pressure</h3>
        <p className="hl-inspector-hint hl-inspector-note">
          A bounded connection holds at most its capacity, counting the message being worked on. A sender to a full connection
          waits, unless it drops its oldest waiting message.
        </p>
        <ParamForm
          fields={boundsFields(edge)}
          onCommit={(key, value) => {
            setBounds(nextBounds(edge, key, value));
          }}
        />
      </section>
    </div>
  );
}
