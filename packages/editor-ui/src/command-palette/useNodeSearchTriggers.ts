/**
 * `useNodeSearchTriggers` — bridge React Flow gestures to the node-search
 * palette. Returns handlers to spread onto `<ReactFlow>`:
 *
 *   - `onConnectStart` / `onConnectEnd`: when a link is dragged from a port and
 *     released into empty space (not onto a handle), open the palette pre-filtered
 *     to nodes that can complete that connection.
 *   - `onPaneClick`: two clicks on the empty pane within `doubleClickMs` open a
 *     blank palette. We use React Flow's first-class `onPaneClick` (which fires
 *     only for the pane, never for nodes/edges/handles) rather than a raw DOM
 *     double-click, so this never reaches into React Flow's internal markup.
 *
 * Screen→flow coordinate conversion uses the React Flow instance, so created
 * nodes land under the pointer regardless of pan/zoom. This hook must be used
 * within a `ReactFlowProvider` (React Flow's own requirement for `useReactFlow`).
 */

import { useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { OnConnectStartParams } from '@xyflow/react';
import type { EditorCore, PortDescriptor } from '@hlang-org/editor-core';
import type { NodeSearchController } from './useNodeSearch';
import type { PendingConnection } from './node-search-model';

/** Max gap between two pane clicks to count as a double-click. */
const DEFAULT_DOUBLE_CLICK_MS = 350;

/** Options for the trigger hook (injectable clock keeps it deterministic). */
export interface NodeSearchTriggerOptions {
  /** Double-click detection window in ms. Defaults to 350. */
  readonly doubleClickMs?: number;
  /** Monotonic clock in ms. Defaults to `performance.now`. */
  readonly now?: () => number;
}

/** Where a pointer is, as mouse events (DOM and React) report it. */
export interface PointerPosition {
  readonly clientX: number;
  readonly clientY: number;
}

/** Where touches ended, as touch events report it. */
export interface TouchPositions {
  readonly changedTouches: ArrayLike<PointerPosition>;
}

/** How a connection drag ended: on a node, or (`toNode: null`) in empty space. */
export interface ConnectionEnd {
  readonly toNode: object | null;
}

/**
 * Handlers to spread onto the `<ReactFlow>` element. Each declares only what it
 * reads, so React Flow's full events and states fit them.
 */
export interface NodeSearchTriggers {
  readonly onConnectStart: (event: unknown, params: OnConnectStartParams) => void;
  readonly onConnectEnd: (event: PointerPosition | TouchPositions, connectionState: ConnectionEnd) => void;
  /** Attach to `<ReactFlow onPaneClick>`; a rapid second click opens the palette. */
  onPaneClick(event: PointerPosition): void;
}

export function useNodeSearchTriggers(
  core: EditorCore,
  search: NodeSearchController,
  options: NodeSearchTriggerOptions = {},
): NodeSearchTriggers {
  const flow = useReactFlow();
  const doubleClickMs = options.doubleClickMs ?? DEFAULT_DOUBLE_CLICK_MS;
  const now = options.now ?? defaultNow;

  // Remember the endpoint a connection drag started from, so connect-end can
  // build the pending connection when it lands in empty space.
  const startRef = useRef<OnConnectStartParams | null>(null);
  // Timestamp of the last pane click, for double-click detection.
  const lastPaneClickRef = useRef<number>(Number.NEGATIVE_INFINITY);

  const onConnectStart = useCallback((_event: unknown, params: OnConnectStartParams): void => {
    startRef.current = params;
  }, []);

  const onConnectEnd = useCallback(
    (event: PointerPosition | TouchPositions, connectionState: ConnectionEnd): void => {
      const start = startRef.current;
      startRef.current = null;
      // Only act when the drag ended in empty space (no destination node/handle).
      if (connectionState.toNode !== null || start === null) {
        return;
      }
      if (start.nodeId === null || start.handleId === null || start.handleType === null) {
        return;
      }
      const point = pointerOf(event);
      if (point === null) {
        return;
      }
      // Resolve the descriptor of the port the drag started from; the palette
      // needs it to decide which node types can complete the connection.
      const fromPort = resolvePort(core, start.nodeId, start.handleId);
      if (fromPort === undefined) {
        return;
      }
      const pending: PendingConnection = {
        fromEndpoint: { nodeId: start.nodeId, portId: start.handleId },
        fromPort,
        // A drag from a 'source' (output) handle needs a target node; a drag
        // from a 'target' (input) handle needs a source node.
        direction: start.handleType === 'source' ? 'from-source' : 'from-target',
      };
      search.openFromConnection(
        point,
        flow.screenToFlowPosition(point),
        pending,
      );
    },
    [core, flow, search],
  );

  const onPaneClick = useCallback(
    (event: PointerPosition): void => {
      const t = now();
      const isDouble = t - lastPaneClickRef.current <= doubleClickMs;
      lastPaneClickRef.current = t;
      if (!isDouble) {
        return;
      }
      lastPaneClickRef.current = Number.NEGATIVE_INFINITY; // consume the pair
      const screen = { x: event.clientX, y: event.clientY };
      search.openBlank(screen, flow.screenToFlowPosition(screen));
    },
    [flow, search, doubleClickMs, now],
  );

  return { onConnectStart, onConnectEnd, onPaneClick };
}

function defaultNow(): number {
  return performance.now();
}

/** Resolve a port descriptor by node id + port id from the graph model. */
function resolvePort(
  core: EditorCore,
  nodeId: string,
  portId: string,
): PortDescriptor | undefined {
  const node = core.model.getNode(nodeId);
  return node?.ports.find(port => port.id === portId);
}

/** Extract client pointer coords from a mouse or touch connect-end event. */
function pointerOf(event: PointerPosition | TouchPositions): { x: number; y: number } | null {
  if ('clientX' in event) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}
