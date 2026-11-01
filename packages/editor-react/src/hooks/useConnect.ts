/**
 * `useConnect` / `useIsValidConnection` — translate React Flow connection
 * gestures into validated editor commands.
 *
 * `useIsValidConnection` gates the drag in real time via the core's
 * `IConnectionValidator`. `useConnect` commits a completed connection as a
 * `ConnectCommand` (which re-validates and records undo history). Edge ids are
 * produced by the core's id generator so they round-trip through serialization.
 */

import { useCallback } from 'react';
import type { Connection, IsValidConnection } from '@xyflow/react';
import type { EditorCore } from '@hlang-org/editor-core';
import { ConnectCommand } from '@hlang-org/editor-core';
import { endpointsFromConnection } from '../mapping/convert';

/** Returns an `isValidConnection` predicate backed by the core validator. */
export function useIsValidConnection(core: EditorCore): IsValidConnection {
  return useCallback(
    (edgeOrConnection): boolean => {
      const endpoints = endpointsFromConnection({
        source: edgeOrConnection.source,
        target: edgeOrConnection.target,
        sourceHandle: edgeOrConnection.sourceHandle ?? null,
        targetHandle: edgeOrConnection.targetHandle ?? null,
      });
      if (endpoints === undefined) {
        return false;
      }
      return core.validator.validate(endpoints.source, endpoints.target, core.model).ok;
    },
    [core],
  );
}

/** Returns an `onConnect` handler that commits a validated `ConnectCommand`. */
export function useConnect(core: EditorCore): (connection: Connection) => void {
  return useCallback(
    (connection: Connection): void => {
      const endpoints = endpointsFromConnection(connection);
      if (endpoints === undefined) {
        return;
      }
      const edgeId = core.idGenerator.nextEdgeId();
      core.commands.execute(new ConnectCommand(edgeId, endpoints.source, endpoints.target));
    },
    [core],
  );
}
