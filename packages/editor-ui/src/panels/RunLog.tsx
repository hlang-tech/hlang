/**
 * `RunLog` — the editor's live console. Every message the running graph
 * delivers, and every node error, as it happens: when (since the run
 * started), from which node and port to which, a preview of the value, and
 * how long the receiving node took. Choosing a row selects its node, and the
 * log can follow the selection. It reads the `RunTrace` from
 * `<RunTraceProvider>` and renders nothing without one.
 */

import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { EditorCore } from '@hlang-org/editor-core';
import { useSelection } from '@hlang-org/editor-react';
import { useFollowScroll } from '../hooks/useFollowScroll';
import { formatDuration, formatElapsed } from '../live/format';
import { previewValue } from '../live/preview';
import { involves } from '../live/run-trace';
import type { RunLogEntry } from '../live/run-trace';
import { useRunTraceStore, useRunTraceVersion } from '../live/RunTraceContext';
import './RunLog.css';

export interface RunLogProps {
  readonly core: EditorCore;
  /** Also called when a row is chosen, after its node is selected (e.g. to bring it into view). */
  readonly onSelectNode?: (nodeId: string) => void;
  /** The log's name, shown at the start of its header and used as its accessible name. */
  readonly title?: string;
  /** Shown at the start of the header in place of the title, e.g. the host's tabs. */
  readonly leading?: ReactNode;
}

export function RunLog({ core, onSelectNode, title = 'Run log', leading }: RunLogProps): ReactElement | null {
  const trace = useRunTraceStore();
  useRunTraceVersion(trace);
  const selection = useSelection(core);
  const [onlySelected, setOnlySelected] = useState(false);
  const { ref: bodyRef, onScroll, follow, setFollow } = useFollowScroll<HTMLOListElement>();

  const all = trace === null ? [] : trace.entries();
  const selectedId = selection.selectedNodes.length === 1 ? selection.selectedNodes[0] : undefined;
  const filterId = onlySelected ? selectedId : undefined;
  const entries = filterId === undefined ? all : all.filter(entry => involves(entry, filterId));

  if (trace === null) {
    return null;
  }

  const label = (nodeId: string): string => core.model.getNode(nodeId)?.name ?? nodeId;
  const choose = (nodeId: string): void => {
    core.selection.selectNodes([nodeId], 'replace');
    onSelectNode?.(nodeId);
  };

  return (
    <section className="hl-runlog" aria-label={title}>
      <header className="hl-runlog-head">
        {leading ?? <span className="hl-runlog-title">{title}</span>}
        <span className="hl-runlog-count hl-mono">
          {entries.length === all.length
            ? `${String(all.length)} events`
            : `${String(entries.length)} of ${String(all.length)} events`}
          {trace.dropped > 0 ? ` · ${String(trace.dropped)} earlier not kept` : ''}
        </span>
        <span className="hl-runlog-actions">
          <button
            type="button"
            className={`hl-runlog-toggle${onlySelected ? ' is-on' : ''}`}
            aria-pressed={onlySelected}
            disabled={selectedId === undefined && !onlySelected}
            title={selectedId === undefined ? 'Select a node to filter by it' : `Only ${label(selectedId)}`}
            onClick={() => {
              setOnlySelected(value => !value);
            }}
          >
            {onlySelected && selectedId !== undefined ? `Only ${label(selectedId)}` : 'Selected node'}
          </button>
          <button
            type="button"
            className={`hl-runlog-toggle${follow ? ' is-on' : ''}`}
            aria-pressed={follow}
            onClick={() => {
              setFollow(!follow);
            }}
          >
            Follow
          </button>
          <button
            type="button"
            className="hl-runlog-toggle"
            disabled={all.length === 0}
            onClick={() => {
              trace.clear();
            }}
          >
            Clear
          </button>
        </span>
      </header>
      {entries.length === 0 ? (
        <p className="hl-runlog-empty">
          {all.length === 0
            ? 'Run the graph to see every message as it moves through it.'
            : 'Nothing involving the selected node yet.'}
        </p>
      ) : (
        <ol className="hl-runlog-body hl-mono" ref={bodyRef} onScroll={onScroll}>
          {entries.map(entry => (
            <Row key={entry.seq} entry={entry} label={label} onChoose={choose} />
          ))}
        </ol>
      )}
    </section>
  );
}

function Row({
  entry,
  label,
  onChoose,
}: {
  readonly entry: RunLogEntry;
  readonly label: (nodeId: string) => string;
  readonly onChoose: (nodeId: string) => void;
}): ReactElement {
  switch (entry.kind) {
    case 'error':
      return (
        <Event className="is-error" at={entry.at} onChoose={() => onChoose(entry.nodeId)} ms="">
          <NodePort node={label(entry.nodeId)} port="error" />
          <span className="hl-runlog-value">{previewValue(entry.error)}</span>
        </Event>
      );
    case 'ended':
      return (
        <Event className="is-end" at={entry.at} onChoose={() => onChoose(entry.nodeId)} ms="">
          <NodePort node={label(entry.nodeId)} port={entry.portId} />
          <span className="hl-runlog-value">ended</span>
        </Event>
      );
    case 'finished':
      return (
        <Event className="is-end" at={entry.at} onChoose={() => onChoose(entry.nodeId)} ms="">
          <NodePort node={label(entry.nodeId)} port="" />
          <span className="hl-runlog-value">finished</span>
        </Event>
      );
    case 'dropped':
      return (
        <Event className="is-dropped" at={entry.at} onChoose={() => onChoose(entry.targetNodeId)} ms="">
          <Route entry={entry} label={label} />
          <span className="hl-runlog-value">dropped {previewValue(entry.message)}</span>
        </Event>
      );
    case 'delivery':
      return (
        <Event className="" at={entry.at} onChoose={() => onChoose(entry.targetNodeId)} ms={formatDuration(entry.duration)}>
          <Route entry={entry} label={label} />
          <span className="hl-runlog-value">{previewValue(entry.message)}</span>
        </Event>
      );
  }
}

/** One row: when, what (the children: a route or a node, and a value), and how long. */
function Event({
  className,
  at,
  ms,
  onChoose,
  children,
}: {
  readonly className: string;
  readonly at: number;
  readonly ms: string;
  readonly onChoose: () => void;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <li className={`hl-runlog-row ${className}`.trim()}>
      <button type="button" className="hl-runlog-hit" onClick={onChoose}>
        <span className="hl-runlog-at">{formatElapsed(at)}</span>
        {children}
        <span className="hl-runlog-ms">{ms}</span>
      </button>
    </li>
  );
}

function NodePort({ node, port }: { readonly node: string; readonly port: string }): ReactElement {
  return (
    <span className="hl-runlog-route">
      <span className="hl-runlog-node">{node}</span>
      {port === '' ? null : <span className="hl-runlog-port">{port}</span>}
    </span>
  );
}

function Route({
  entry,
  label,
}: {
  readonly entry: { readonly sourceNodeId: string; readonly sourcePortId: string; readonly targetNodeId: string; readonly targetPortId: string };
  readonly label: (nodeId: string) => string;
}): ReactElement {
  return (
    <span className="hl-runlog-route">
      <span className="hl-runlog-node">{label(entry.sourceNodeId)}</span>
      <span className="hl-runlog-port">{entry.sourcePortId}</span>
      <span className="hl-runlog-arrow" aria-label="to">→</span>
      <span className="hl-runlog-node">{label(entry.targetNodeId)}</span>
      <span className="hl-runlog-port">{entry.targetPortId}</span>
    </span>
  );
}
