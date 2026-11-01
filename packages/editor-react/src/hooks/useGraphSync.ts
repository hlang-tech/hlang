/**
 * `useGraphSync` — derive React Flow nodes/edges from the headless model and
 * keep them in sync via the editor's event bus.
 *
 * The model is the single source of truth. We subscribe to the graph-mutating
 * events on `IEventBus` and, via `useSyncExternalStore`, re-read the model into
 * React Flow shapes whenever they fire. A version counter provides a cheap,
 * stable snapshot identity so React only re-renders on real changes.
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { EditorCore, IDisposable } from '@hlang-org/editor-core';
import { toRFEdge, toRFNode } from '../mapping/convert';
import type { HlangRFEdge, HlangRFNode } from '../mapping/types';
import { RECONCILE_EVENTS } from './reconcile-events';

export interface GraphView {
  readonly nodes: readonly HlangRFNode[];
  readonly edges: readonly HlangRFEdge[];
}

/** Subscribe to model changes and return the current React Flow view. */
export function useGraphSync(core: EditorCore): GraphView {
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const disposables: IDisposable[] = RECONCILE_EVENTS.map(kind =>
        core.events.on(kind, () => {
          versionRef.current += 1;
          onStoreChange();
        }),
      );
      return (): void => {
        for (const disposable of disposables) {
          disposable.dispose();
        }
      };
    },
    [core],
  );

  const getSnapshot = useCallback((): number => versionRef.current, []);

  const version = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo<GraphView>(() => {
    const nodes = core.model.getNodes().map(node =>
      toRFNode(node, {
        hidden: core.viewState.isHidden(node.id),
        locked: core.viewState.isLocked(node.id),
        selected: core.selection.isSelected(node.id),
      }),
    );
    const edges = core.model
      .getEdges()
      .map(edge => toRFEdge(edge, core.model.getNode(edge.source.nodeId)));
    return { nodes, edges };
    // `version` is the intentional invalidation key: it changes on every model
    // mutation and forces a fresh derivation from the (mutable) model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core, version]);
}
