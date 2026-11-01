/**
 * React glue for the LiveSignalStore. A single store instance is provided via
 * context; node/edge components subscribe to their own id through
 * `useNodeLiveState` / `useEdgeFlowing` (each returns a primitive, so only the
 * components whose state actually flips re-render — no global DOM scanning).
 */

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { LiveSignalStore } from './live-signal-store';
import type { NodeLiveState } from './live-signal-store';

const LiveSignalContext = createContext<LiveSignalStore | null>(null);

export interface LiveSignalProviderProps {
  /** Optional external store; a fresh one is created if omitted. */
  readonly store?: LiveSignalStore;
  readonly children: ReactNode;
}

export function LiveSignalProvider({ store, children }: LiveSignalProviderProps): ReactElement {
  const value = useMemo(() => store ?? new LiveSignalStore(), [store]);
  return <LiveSignalContext.Provider value={value}>{children}</LiveSignalContext.Provider>;
}

/** Access the live store, or `null` when there is no provider (visuals off). */
export function useLiveSignalStore(): LiveSignalStore | null {
  return useContext(LiveSignalContext);
}

/** Subscribe to a single node's live state. Idle when no store is present. */
export function useNodeLiveState(nodeId: string): NodeLiveState {
  const store = useContext(LiveSignalContext);
  return useSyncExternalStore(
    onChange => (store === null ? () => undefined : store.subscribeNode(nodeId, onChange)),
    () => (store === null ? 'idle' : store.getNodeState(nodeId)),
    () => 'idle',
  );
}

/** Subscribe to a single edge's flowing state. False when no store is present. */
export function useEdgeFlowing(edgeId: string): boolean {
  const store = useContext(LiveSignalContext);
  return useSyncExternalStore(
    onChange => (store === null ? () => undefined : store.subscribeEdge(edgeId, onChange)),
    () => (store === null ? false : store.isEdgeFlowing(edgeId)),
    () => false,
  );
}
