/**
 * `useDiagnostics` — reactive edit-time diagnostics over the core's
 * `IDiagnosticsService`. Re-reads whenever the service recomputes (on any
 * structural graph change), exposing the flat list plus a per-node index and a
 * `worstOf(id)` helper for rendering a single badge per node.
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { Diagnostic, DiagnosticSeverity, EditorCore, NodeId } from '@hlang-org/editor-core';

export interface DiagnosticsState {
  readonly all: readonly Diagnostic[];
  readonly byNode: ReadonlyMap<NodeId, readonly Diagnostic[]>;
  /** The most severe diagnostic on a node (error > warning), or undefined. */
  worstOf(id: NodeId): Diagnostic | undefined;
}

const RANK: Record<DiagnosticSeverity, number> = { error: 2, warning: 1 };

export function useDiagnostics(core: EditorCore): DiagnosticsState {
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const disposable = core.diagnostics.onChanged(() => {
        versionRef.current += 1;
        onStoreChange();
      });
      return (): void => {
        disposable.dispose();
      };
    },
    [core],
  );

  const getSnapshot = useCallback((): number => versionRef.current, []);
  const version = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo<DiagnosticsState>(() => {
    void version;
    const all = core.diagnostics.getDiagnostics();
    const byNode = new Map<NodeId, Diagnostic[]>();
    for (const d of all) {
      if (d.nodeId === undefined) {
        continue;
      }
      const list = byNode.get(d.nodeId);
      if (list === undefined) {
        byNode.set(d.nodeId, [d]);
      } else {
        list.push(d);
      }
    }
    const worstOf = (id: NodeId): Diagnostic | undefined => {
      const list = byNode.get(id);
      if (list === undefined || list.length === 0) {
        return undefined;
      }
      return [...list].sort((a, b) => RANK[b.severity] - RANK[a.severity])[0];
    };
    return { all, byNode, worstOf };
  }, [core, version]);
}
