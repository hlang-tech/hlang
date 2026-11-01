/**
 * `useLiveSignals` — feed a running flow's activity/error signals into the
 * LiveSignalStore, which node/edge components subscribe to by id. No global DOM
 * access and no dependency on React Flow's private structure: the store is the
 * single source of truth and components read their own state (see
 * `LiveSignalContext`). Must be used within a `<LiveSignalProvider>`.
 */

import { useEffect } from 'react';
import type { EditorCore } from '@hlang-org/editor-core';
import type { IExecutionHandle } from '@hlang-org/editor-core';
import { useLiveSignalStore } from '../live/LiveSignalContext';
import type { EdgeIndexEntry, LiveSignalStore } from '../live/live-signal-store';

/**
 * Drive live visuals from an execution handle. Pass the handle returned by
 * `core.execution.run(...)`; pass `undefined` to clear. Keeps the store's edge
 * index in sync with the model so a source-port pulse lights the right edges.
 *
 * The store is taken from `<LiveSignalProvider>` context; pass `explicitStore`
 * when the feeding component sits at or above the provider (so it and the
 * subscribing components share one store).
 */
export function useLiveSignals(
  core: EditorCore,
  handle: IExecutionHandle | undefined,
  explicitStore?: LiveSignalStore,
): void {
  const contextStore = useLiveSignalStore();
  const store = explicitStore ?? contextStore;

  // Keep the edge index current whenever the graph changes.
  useEffect(() => {
    if (store === null) {
      return;
    }
    const syncEdges = (): void => {
      const entries: EdgeIndexEntry[] = core.model.getEdges().map(edge => ({
        id: edge.id,
        sourceNodeId: edge.source.nodeId,
        sourcePortId: edge.source.portId,
        isError: edge.source.portId === '@node/error',
      }));
      store.setEdgeIndex(entries);
    };
    syncEdges();
    const added = core.events.on('edgeAdded', syncEdges);
    const removed = core.events.on('edgeRemoved', syncEdges);
    return (): void => {
      added.dispose();
      removed.dispose();
    };
  }, [core, store]);

  // Subscribe to the running handle's signals and feed the store.
  useEffect(() => {
    if (store === null) {
      return;
    }
    if (handle === undefined) {
      store.reset();
      return;
    }
    const activitySub = handle.onActivity(e => store.markActivity(e.nodeId, e.portId));
    const errorSub = handle.onError(e => store.markError(e.nodeId));
    return (): void => {
      activitySub.dispose();
      errorSub.dispose();
      store.reset();
    };
  }, [store, handle]);
}
