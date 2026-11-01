/**
 * `useNodeChanges` / `useEdgeChanges` — translate React Flow change events into
 * editor commands, so the headless model stays the single source of truth.
 *
 * - A committed position drag (`dragging === false`) becomes a `MoveNodeCommand`.
 * - A node/edge `remove` becomes a `RemoveNodeCommand` / `DisconnectCommand`.
 * - A `select` change is forwarded to the selection service.
 *
 * Intermediate drag frames (`dragging === true`) are ignored for history's
 * sake; React Flow renders those live from its own transient state, and the
 * final committed position is what we record.
 */

import { useCallback } from 'react';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import type { EditorCore } from '@hlang-org/editor-core';
import {
  MoveNodeCommand,
  RemoveNodeCommand,
  DisconnectCommand,
} from '@hlang-org/editor-core';
import type { HlangRFNode, HlangRFEdge } from '../mapping/types';

export function useNodeChanges(
  core: EditorCore,
): (changes: NodeChange<HlangRFNode>[]) => void {
  return useCallback(
    (changes: NodeChange<HlangRFNode>[]): void => {
      for (const change of changes) {
        if (change.type === 'position') {
          if (change.dragging === false && change.position !== undefined) {
            core.commands.execute(new MoveNodeCommand(change.id, change.position));
          }
        } else if (change.type === 'remove') {
          core.commands.execute(new RemoveNodeCommand(change.id));
        } else if (change.type === 'select') {
          // Map to add/toggle: `toggle` on a currently-selected id removes it,
          // which matches a deselect; on an unselected id, `add` selects it.
          const currentlySelected = core.selection.isSelected(change.id);
          if (change.selected && !currentlySelected) {
            core.selection.selectNodes([change.id], 'add');
          } else if (!change.selected && currentlySelected) {
            core.selection.selectNodes([change.id], 'toggle');
          }
        }
      }
    },
    [core],
  );
}

export function useEdgeChanges(
  core: EditorCore,
): (changes: EdgeChange<HlangRFEdge>[]) => void {
  return useCallback(
    (changes: EdgeChange<HlangRFEdge>[]): void => {
      for (const change of changes) {
        if (change.type === 'remove') {
          core.commands.execute(new DisconnectCommand(change.id));
        } else if (change.type === 'select') {
          const currentlySelected = core.selection.isSelected(change.id);
          if (change.selected && !currentlySelected) {
            core.selection.selectEdges([change.id], 'add');
          } else if (!change.selected && currentlySelected) {
            core.selection.selectEdges([change.id], 'toggle');
          }
        }
      }
    },
    [core],
  );
}
