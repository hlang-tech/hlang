/**
 * `OutlineTree` — the left-rail outline: a two-level GROUPING, not a tree.
 *
 * hlang's graph is a DAG (R/T/W nodes, O->I edges, T<->T feedback allowed), so
 * there is no parent/child hierarchy to render. Instead we group by weakly-
 * connected component (`GraphTopology.components()`): each component is one
 * expandable "Flow N" container, and its member nodes are listed FLAT — they are
 * peers. The real relationships between nodes (edges, fan-in/out) are shown on
 * the canvas, never faked here as nesting. So: the outline expresses BELONGING
 * (which Flow a node is in); the canvas expresses DATA FLOW.
 *
 * Rows carry per-type icons, a diagnostic marker, hover-revealed visible/lock
 * controls, and a solid silver highlight when selected. Clicking a node selects
 * and focuses it. Visibility/lock are per-node view state via `useViewState`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { EditorCore, EditorNode, NodeId, TopologyComponent } from '@hlang-org/editor-core';
import { GraphTopology } from '@hlang-org/editor-core';
import { useSelection, useViewState, useDiagnostics } from '@hlang-org/editor-react';
import { NodeIcon, EyeIcon, EyeOffIcon, LockIcon, UnlockIcon } from '../icons/node-icons';
import { DiagnosticBadge } from './DiagnosticBadge';
import './OutlineTree.css';

export interface OutlineTreeProps {
  readonly core: EditorCore;
  readonly onFocus?: (id: NodeId) => void;
}

/**
 * Reactively derive the graph's weakly-connected components from the LIVE model.
 * Rebuilding a GraphTopology from scratch each change is cheap for editor-sized
 * graphs and — crucially — timing-proof: a bulk `model.restore` (which emits no
 * per-node events) is picked up by the mount effect, and normal edits by the
 * structural-event subscription. This avoids the stale-empty-index bug.
 */
function useTopologyComponents(core: EditorCore): readonly TopologyComponent[] {
  const [tick, setTick] = useState(0);
  const bump = useCallback((): void => setTick(t => t + 1), []);

  useEffect(() => {
    // Normal edits fire structural events.
    const kinds = ['nodeAdded', 'nodeRemoved', 'nodeChanged', 'edgeAdded', 'edgeRemoved'] as const;
    const disposers = kinds.map(k => core.events.on(k, bump));
    // Bulk loads (restore) emit no events — recompute once now that the host's
    // mount effect has populated the model.
    bump();
    return () => {
      for (const d of disposers) {
        d.dispose();
      }
    };
  }, [core, bump]);

  return useMemo(() => {
    void tick;
    const topo = new GraphTopology();
    topo.reset(core.model.getNodes(), core.model.getEdges());
    return topo.components();
  }, [core, tick]);
}

export function OutlineTree({ core, onFocus }: OutlineTreeProps): ReactElement {
  const components = useTopologyComponents(core);
  const selection = useSelection(core);
  const viewState = useViewState(core);
  const diagnostics = useDiagnostics(core);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  // Rebuild the id->node map whenever the component set changes (which happens
  // on any graph change). `components` identity is the change signal.
  const nodeById = useMemo(() => {
    const m = new Map<NodeId, EditorNode>();
    for (const n of core.model.getNodes()) {
      m.set(n.id, n);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core, components]);

  const toggleGroup = useCallback((id: string): void => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const select = useCallback(
    (id: NodeId): void => {
      selection.selectNodes([id], 'replace');
      onFocus?.(id);
    },
    [selection, onFocus],
  );

  if (components.length === 0) {
    return <p className="hl-outline-empty hl-mono">no layers yet</p>;
  }

  // Order groups largest-first for a stable, sensible reading order.
  const groups = [...components].sort((a, b) => b.nodeIds.size - a.nodeIds.size);

  return (
    <div className="hl-outline" role="tree" aria-label="Outline">
      {groups.map((group, gi) => {
        const members = [...group.nodeIds]
          .map(id => nodeById.get(id))
          .filter((n): n is EditorNode => n !== undefined);
        const open = !collapsed.has(group.id);
        const groupName = `Flow ${String(gi + 1)}`;
        return (
          <div key={group.id} className="hl-outline-group" role="treeitem" aria-expanded={open}>
            <button
              className="hl-outline-grouphead"
              onClick={() => toggleGroup(group.id)}
            >
              <span className={'hl-outline-caret' + (open ? ' is-open' : '')} aria-hidden>
                ▸
              </span>
              <span className="hl-outline-groupname">{groupName}</span>
              <span className="hl-outline-count hl-mono">{group.nodeIds.size}</span>
            </button>
            {open && (
              <ul className="hl-outline-members">
                {members.map(node => {
                  const active = selection.isSelected(node.id);
                  const isHidden = viewState.isHidden(node.id);
                  const isLocked = viewState.isLocked(node.id);
                  const hasImage =
                    typeof node.params.imageUrl === 'string' && node.params.imageUrl.length > 0;
                  return (
                    <li key={node.id}>
                      <div
                        className={
                          'hl-outline-row' +
                          (active ? ' is-active' : '') +
                          (isHidden ? ' is-hidden' : '') +
                          (isLocked ? ' is-locked' : '')
                        }
                      >
                        <button className="hl-outline-main" onClick={() => select(node.id)}>
                          <span
                            className={`hl-outline-icon hl-kind-${node.kind.toLowerCase()}`}
                            aria-hidden
                          >
                            {hasImage ? (
                              <img
                                className="hl-outline-thumb"
                                src={node.params.imageUrl as string}
                                alt=""
                              />
                            ) : (
                              <NodeIcon code={node.code} kind={node.kind} size={13} />
                            )}
                          </span>
                          <span className="hl-outline-name">{node.name}</span>
                          {/* Edit-time diagnostic marker (error/warning). */}
                          {(() => {
                            const diag = diagnostics.worstOf(node.id);
                            return diag === undefined ? null : (
                              <DiagnosticBadge diagnostic={diag} variant="hl-outline-diag" size={11} />
                            );
                          })()}
                          {/* Persistent status glyphs: only shown when a flag is
                              ON, so a hidden/locked layer stays legible at rest
                              (not just on hover). */}
                          {isLocked && (
                            <span className="hl-outline-badge" aria-hidden>
                              <LockIcon size={11} />
                            </span>
                          )}
                          {isHidden && (
                            <span className="hl-outline-badge" aria-hidden>
                              <EyeOffIcon size={11} />
                            </span>
                          )}
                        </button>
                        <span className="hl-outline-controls">
                          <button
                            className={'hl-outline-ctl' + (isHidden ? ' is-active-ctl' : '')}
                            onClick={() => viewState.toggleHidden(node.id)}
                            aria-label={isHidden ? 'Show layer' : 'Hide layer'}
                            title={isHidden ? 'Show' : 'Hide'}
                          >
                            {isHidden ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                          <button
                            className={'hl-outline-ctl' + (isLocked ? ' is-active-ctl' : '')}
                            onClick={() => viewState.toggleLocked(node.id)}
                            aria-label={isLocked ? 'Unlock layer' : 'Lock layer'}
                            title={isLocked ? 'Unlock' : 'Lock'}
                          >
                            {isLocked ? <LockIcon /> : <UnlockIcon />}
                          </button>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
