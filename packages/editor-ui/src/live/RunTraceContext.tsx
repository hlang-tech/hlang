/**
 * React glue for `RunTrace`. A host provides one trace for the editor; the run
 * log and the inspector read it through `useRunTraceVersion`, which changes at
 * most once per frame, so a busy flow costs one render per frame.
 */

import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { RunTrace } from './run-trace';

const RunTraceContext = createContext<RunTrace | null>(null);

export interface RunTraceProviderProps {
  readonly trace: RunTrace;
  readonly children: ReactNode;
}

export function RunTraceProvider({ trace, children }: RunTraceProviderProps): ReactElement {
  return <RunTraceContext.Provider value={trace}>{children}</RunTraceContext.Provider>;
}

/** The trace, or `null` when there is no provider (run views stay hidden). */
export function useRunTraceStore(): RunTrace | null {
  return useContext(RunTraceContext);
}

/** Re-renders the caller when the trace changes; returns its version (0 without a trace). */
export function useRunTraceVersion(trace: RunTrace | null): number {
  return useSyncExternalStore(
    onChange => (trace === null ? () => undefined : trace.subscribe(onChange)),
    () => (trace === null ? 0 : trace.getVersion()),
    () => 0,
  );
}
