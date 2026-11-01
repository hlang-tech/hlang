/**
 * `useEdgeBounds` — one connection and its bounds (RFC 0001), kept current
 * as commands change it, with a setter that commits an undoable
 * `SetEdgeBoundsCommand`.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { SetEdgeBoundsCommand } from '@hlang-org/editor-core';
import type { EdgeBounds, EdgeId, EditorCore, EditorEdge } from '@hlang-org/editor-core';

export interface EdgeBoundsHandle {
  /** The edge, or undefined if it no longer exists. */
  readonly edge: EditorEdge | undefined;
  /** Bound the connection, or unbound it, as one undoable step. */
  readonly setBounds: (bounds: EdgeBounds) => void;
}

export function useEdgeBounds(core: EditorCore, edgeId: EdgeId | undefined): EdgeBoundsHandle {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const changed = core.events.on('edgeChanged', event => {
        if (event.edge.id === edgeId) {
          onStoreChange();
        }
      });
      const removed = core.events.on('edgeRemoved', event => {
        if (event.edgeId === edgeId) {
          onStoreChange();
        }
      });
      return (): void => {
        changed.dispose();
        removed.dispose();
      };
    },
    [core, edgeId],
  );
  // The model replaces an edge object whenever it changes, so the object
  // itself is a stable snapshot.
  const getSnapshot = useCallback(
    (): EditorEdge | undefined => (edgeId === undefined ? undefined : core.model.getEdge(edgeId)),
    [core, edgeId],
  );
  const edge = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setBounds = useCallback(
    (bounds: EdgeBounds): void => {
      if (edgeId !== undefined) {
        core.commands.execute(new SetEdgeBoundsCommand(edgeId, bounds));
      }
    },
    [core, edgeId],
  );

  return { edge, setBounds };
}
