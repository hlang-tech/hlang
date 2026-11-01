/**
 * `useNodeSearch` — palette state + commit logic for creating nodes by search.
 *
 * The palette can open in two modes:
 *   - blank: create a free-standing node at a point (canvas double-click, `/`).
 *   - from a released connection: create a node AND wire the dangling link to a
 *     compatible port on it, as ONE undoable step.
 *
 * All mutation goes through the core command service; connection legality and
 * edge ids come from the core (validator + id generator). This hook holds no
 * graph rules of its own.
 */

import { useCallback, useMemo, useState } from 'react';
import type { EditorCore, NodeDescriptor, Point } from '@hlang-org/editor-core';
import { AddNodeCommand, ConnectCommand } from '@hlang-org/editor-core';
import {
  searchNodes,
  connectableCandidates,
} from './node-search-model';
import type {
  PendingConnection,
  NodeSearchResult,
} from './node-search-model';

/** Where and how the palette is currently open. */
export interface NodeSearchState {
  /** Screen-space anchor for rendering the floating panel. */
  readonly screen: Point;
  /** Flow-space position where the created node will be placed. */
  readonly flow: Point;
  /** Set when opened by releasing a dangling connection. */
  readonly pending?: PendingConnection;
}

/** The palette controller returned by the hook. */
export interface NodeSearchController {
  /** Current open state, or `undefined` when closed. */
  readonly state: NodeSearchState | undefined;
  /** Open the palette to create a free-standing node. */
  openBlank(screen: Point, flow: Point): void;
  /** Open the palette to complete a released connection. */
  openFromConnection(screen: Point, flow: Point, pending: PendingConnection): void;
  /** Close the palette without creating anything. */
  close(): void;
  /**
   * Rank registry descriptors for the current query and open mode. In blank
   * mode every node is offered; in connection mode only nodes that can legally
   * complete the pending link are offered.
   */
  results(query: string): readonly NodeSearchResultView[];
  /** Create the chosen node (and wire the pending link, if any), then close. */
  commit(result: NodeSearchResultView): void;
}

/**
 * A ranked result as the palette renders it: the fuzzy match plus, in
 * connection mode, the port on the new node that completes the link.
 */
export interface NodeSearchResultView {
  readonly result: NodeSearchResult;
  /** Present only in connection mode. */
  readonly connectPortId?: string;
}

export function useNodeSearch(core: EditorCore): NodeSearchController {
  const [state, setState] = useState<NodeSearchState | undefined>(undefined);

  const openBlank = useCallback((screen: Point, flow: Point): void => {
    setState({ screen, flow });
  }, []);

  const openFromConnection = useCallback(
    (screen: Point, flow: Point, pending: PendingConnection): void => {
      setState({ screen, flow, pending });
    },
    [],
  );

  const close = useCallback((): void => {
    setState(undefined);
  }, []);

  const descriptors = core.registry.list();

  const results = useCallback(
    (query: string): readonly NodeSearchResultView[] => {
      if (state?.pending !== undefined) {
        return connectableCandidates(
          query,
          descriptors,
          state.pending,
          core.validator,
        ).map(entry => ({ result: entry.candidate, connectPortId: entry.connectPortId }));
      }
      return searchNodes(query, descriptors).map(result => ({ result }));
    },
    [state, descriptors, core],
  );

  const commit = useCallback(
    (view: NodeSearchResultView): void => {
      if (state === undefined) {
        return;
      }
      const descriptor: NodeDescriptor = view.result.value;
      const node = core.registry.createNode(descriptor.code, state.flow);

      if (state.pending !== undefined && view.connectPortId !== undefined) {
        const pending = state.pending;
        const connectPortId = view.connectPortId;
        // Create the node and wire the released link as one undoable step.
        core.history.transact('Create & Connect Node', () => {
          core.commands.execute(new AddNodeCommand(node));
          const edgeId = core.idGenerator.nextEdgeId();
          const newEndpoint = { nodeId: node.id, portId: connectPortId };
          const [source, target] =
            pending.direction === 'from-source'
              ? [pending.fromEndpoint, newEndpoint]
              : [newEndpoint, pending.fromEndpoint];
          core.commands.execute(new ConnectCommand(edgeId, source, target));
        });
      } else {
        core.commands.execute(new AddNodeCommand(node));
      }
      setState(undefined);
    },
    [state, core],
  );

  return useMemo(
    () => ({ state, openBlank, openFromConnection, close, results, commit }),
    [state, openBlank, openFromConnection, close, results, commit],
  );
}
