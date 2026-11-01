/**
 * `NodeRunStats` — what one node did in the current run: messages in and out,
 * errors, the average and longest time it spent on a message, and the latest
 * values. Shown in the inspector when the host provides a `RunTrace`.
 */

import type { ReactElement } from 'react';
import { formatDuration } from '../live/format';
import { previewValue } from '../live/preview';
import { useRunTraceStore, useRunTraceVersion } from '../live/RunTraceContext';

export function NodeRunStats({ nodeId }: { readonly nodeId: string }): ReactElement | null {
  const trace = useRunTraceStore();
  useRunTraceVersion(trace);
  if (trace === null) {
    return null;
  }
  const stats = trace.statsOf(nodeId);
  return (
    <section className="hl-inspector-section">
      <h3 className="hl-inspector-section-title">Run</h3>
      {stats === undefined ? (
        <p className="hl-inspector-hint hl-runstats-hint">No activity in this run.</p>
      ) : (
        <dl className="hl-runstats">
          <div className="hl-runstats-cell">
            <dt>In</dt>
            <dd className="hl-mono">{stats.received}</dd>
          </div>
          <div className="hl-runstats-cell">
            <dt>Out</dt>
            <dd className="hl-mono">{stats.sent}</dd>
          </div>
          <div className={`hl-runstats-cell${stats.errors > 0 ? ' is-error' : ''}`}>
            <dt>Errors</dt>
            <dd className="hl-mono">{stats.errors}</dd>
          </div>
          <div className="hl-runstats-cell">
            <dt>Avg</dt>
            <dd className="hl-mono">{stats.received === 0 ? '—' : formatDuration(stats.totalMs / stats.received)}</dd>
          </div>
          <div className="hl-runstats-cell">
            <dt>Max</dt>
            <dd className="hl-mono">{stats.received === 0 ? '—' : formatDuration(stats.maxMs)}</dd>
          </div>
          {stats.dropped > 0 && (
            <div className="hl-runstats-cell is-warning">
              <dt>Dropped</dt>
              <dd className="hl-mono">{stats.dropped}</dd>
            </div>
          )}
          {stats.finished && (
            <div className="hl-runstats-cell is-done">
              <dt>State</dt>
              <dd>Finished</dd>
            </div>
          )}
          {stats.received > 0 && (
            <div className="hl-runstats-cell is-wide">
              <dt>Last in</dt>
              <dd className="hl-mono">{previewValue(stats.lastReceived)}</dd>
            </div>
          )}
          {stats.sent > 0 && (
            <div className="hl-runstats-cell is-wide">
              <dt>Last out</dt>
              <dd className="hl-mono">{previewValue(stats.lastSent)}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
