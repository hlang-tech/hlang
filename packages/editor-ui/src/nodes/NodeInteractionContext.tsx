/**
 * `NodeInteractionContext` — optional per-node interaction wiring supplied by the
 * host (diagnostics to badge, rename to commit). Node chrome reads it to render a
 * diagnostic badge and to support inline rename, but degrades gracefully to a
 * plain node that cannot be renamed when no provider is present, or when the
 * host leaves `rename` out (a read-only editor) — so editor-ui stays usable
 * without the full editor wiring.
 */

import { createContext, useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { Diagnostic, NodeId } from '@hlang-org/editor-core';

export interface NodeInteraction {
  /** The most severe diagnostic on a node, or undefined. */
  diagnosticFor(id: NodeId): Diagnostic | undefined;
  /**
   * Commit a rename (host routes it through the command service). Without it,
   * a node's name cannot be edited in place.
   */
  readonly rename?: (id: NodeId, name: string) => void;
}

const NoopInteraction: NodeInteraction = {
  diagnosticFor: () => undefined,
};

const NodeInteractionCtx = createContext<NodeInteraction>(NoopInteraction);

export interface NodeInteractionProviderProps {
  readonly value: NodeInteraction;
  readonly children: ReactNode;
}

export function NodeInteractionProvider({
  value,
  children,
}: NodeInteractionProviderProps): ReactElement {
  return <NodeInteractionCtx.Provider value={value}>{children}</NodeInteractionCtx.Provider>;
}

export function useNodeInteraction(): NodeInteraction {
  return useContext(NodeInteractionCtx);
}
