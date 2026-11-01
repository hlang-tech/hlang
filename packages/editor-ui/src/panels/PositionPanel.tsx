/**
 * `PositionPanel` — the "Position" section of the inspector (nover-style): a
 * 3×2 align cluster, the selected node's X/Y, and a Pin toggle. Generic geometry
 * only — alignment/coordinates carry no media/model concept, so this belongs in
 * editor-ui. All moves go through the command service (undoable) via `useRename`-
 * style command execution; nothing mutates the model directly.
 *
 * With a single selected node it shows and edits that node's position. With
 * multiple, the align actions distribute them against their common bounding box.
 */

import { useCallback, useEffect, useReducer } from 'react';
import type { ReactElement } from 'react';
import type { EditorCore, EditorNode } from '@hlang-org/editor-core';
import { MoveNodeCommand } from '@hlang-org/editor-core';
import { useReadOnly, useSelection } from '@hlang-org/editor-react';
import './PositionPanel.css';

export interface PositionPanelProps {
  readonly core: EditorCore;
  /**
   * Optional LIVE position reader (canvas coords) for a node. A drag commits to
   * the model only on drag-stop, so to show X/Y updating DURING a drag the host
   * supplies the canvas's in-flight position (e.g. React Flow's node.position).
   * When omitted, the committed model position is shown. Keeping this a callback
   * means editor-ui never imports React Flow — the binding stays in the host.
   */
  readonly livePosition?: (id: string) => { x: number; y: number } | undefined;
}

type Align = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

function selectedNodes(core: EditorCore): EditorNode[] {
  const ids = core.selection.getSelectedNodes();
  const out: EditorNode[] = [];
  for (const id of ids) {
    const n = core.model.getNode(id);
    if (n !== undefined) {
      out.push(n);
    }
  }
  return out;
}

export function PositionPanel({ core, livePosition }: PositionPanelProps): ReactElement {
  // Re-render on selection change (enabled-state) AND on node change — a drag
  // commits a MoveNodeCommand which emits `nodeChanged`. During a drag, the host
  // re-renders us every frame (its live node list updates), so reading
  // `livePosition` here reflects the in-flight position continuously.
  useSelection(core);
  const readOnly = useReadOnly(core);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const kinds = ['nodeChanged', 'nodeAdded', 'nodeRemoved'] as const;
    const disposers = kinds.map(k => core.events.on(k, bump));
    return () => {
      for (const d of disposers) {
        d.dispose();
      }
    };
  }, [core]);

  const nodes = selectedNodes(core);
  const single = nodes.length === 1 ? nodes[0] : undefined;
  // The displayed position prefers the live canvas position (updates mid-drag),
  // falling back to the committed model position.
  const shownPos =
    single !== undefined ? (livePosition?.(single.id) ?? single.position) : undefined;

  const moveAll = useCallback(
    (fn: (n: EditorNode) => { x: number; y: number }): void => {
      const targets = selectedNodes(core);
      if (targets.length === 0) {
        return;
      }
      core.history.transact('Align', () => {
        for (const n of targets) {
          core.commands.execute(new MoveNodeCommand(n.id, fn(n)));
        }
      });
    },
    [core],
  );

  const align = useCallback(
    (kind: Align): void => {
      const targets = selectedNodes(core);
      if (targets.length === 0) {
        return;
      }
      const xs = targets.map(n => n.position.x);
      const ys = targets.map(n => n.position.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      moveAll(n => {
        switch (kind) {
          case 'left':
            return { x: minX, y: n.position.y };
          case 'hcenter':
            return { x: cx, y: n.position.y };
          case 'right':
            return { x: maxX, y: n.position.y };
          case 'top':
            return { x: n.position.x, y: minY };
          case 'vcenter':
            return { x: n.position.x, y: cy };
          case 'bottom':
            return { x: n.position.x, y: maxY };
        }
      });
    },
    [core, moveAll],
  );

  const setCoord = useCallback(
    (axis: 'x' | 'y', value: number): void => {
      if (single === undefined || Number.isNaN(value)) {
        return;
      }
      const next = axis === 'x' ? { x: value, y: single.position.y } : { x: single.position.x, y: value };
      core.commands.execute(new MoveNodeCommand(single.id, next));
    },
    [core, single],
  );

  const disabled = readOnly || nodes.length === 0;
  const alignButtons: readonly { kind: Align; label: string; d: string }[] = [
    { kind: 'left', label: 'Align left', d: 'M5 4v16M9 8h8M9 16h5' },
    { kind: 'hcenter', label: 'Align centre', d: 'M12 4v16M8 9h8M9 15h6' },
    { kind: 'right', label: 'Align right', d: 'M19 4v16M7 8h8M12 16h3' },
    { kind: 'top', label: 'Align top', d: 'M4 5h16M8 9v8M16 9v5' },
    { kind: 'vcenter', label: 'Align middle', d: 'M4 12h16M9 8v8M15 9v6' },
    { kind: 'bottom', label: 'Align bottom', d: 'M4 19h16M8 7v8M16 12v3' },
  ];

  return (
    <section className="hl-position">
      <h3 className="hl-position-title hl-mono">Position</h3>
      <div className="hl-position-align" role="group" aria-label="Align">
        {alignButtons.map(b => (
          <button
            key={b.kind}
            className="hl-position-alignbtn"
            onClick={() => align(b.kind)}
            disabled={disabled}
            title={b.label}
            aria-label={b.label}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={b.d} />
            </svg>
          </button>
        ))}
      </div>
      <div className="hl-position-coords">
        <label className="hl-position-field">
          <input
            type="number"
            className="hl-position-input hl-mono"
            value={shownPos !== undefined ? Math.round(shownPos.x) : ''}
            disabled={readOnly || single === undefined}
            onChange={e => setCoord('x', Number(e.target.value))}
            aria-label="X position"
          />
          <span className="hl-position-axis hl-mono">X</span>
        </label>
        <label className="hl-position-field">
          <input
            type="number"
            className="hl-position-input hl-mono"
            value={shownPos !== undefined ? Math.round(shownPos.y) : ''}
            disabled={readOnly || single === undefined}
            onChange={e => setCoord('y', Number(e.target.value))}
            aria-label="Y position"
          />
          <span className="hl-position-axis hl-mono">Y</span>
        </label>
      </div>
    </section>
  );
}
