/**
 * `LiveSignalStore` — the source of truth for a running graph's live visual
 * state. It ingests activity/error signals, decays activity over a short
 * window, and lets node/edge components subscribe to THEIR OWN id only.
 *
 * Design rationale (industrial-grade, no tricks):
 *   - No global DOM scanning and no dependency on React Flow's private CSS
 *     classes. Components read their state by id through `useSyncExternalStore`,
 *     so only the components whose state actually flips re-render.
 *   - Edge "flowing" state is computed from an injected edge index, not by
 *     reaching into another layer's model at paint time.
 *   - A single rAF loop advances decay and notifies only changed ids, once per
 *     frame however many signals arrived in it.
 */

/** Live state of a node during execution. */
export type NodeLiveState = 'idle' | 'active' | 'error' | 'finished';

/** How long a node/edge stays "active" after its last emission (ms). */
const ACTIVE_WINDOW_MS = 700;

type Listener = () => void;

/** Composite key for a specific output port on a node. */
function portKey(nodeId: string, portId: string): string {
  return `${nodeId}@${portId}`;
}

/**
 * Minimal edge shape the store needs to map a signal to edges. With its
 * target, a delivery lights exactly the edge that carried it.
 */
export interface EdgeIndexEntry {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly sourcePortId: string;
  readonly targetNodeId?: string;
  readonly targetPortId?: string;
  readonly isError: boolean;
}

/** A message delivered on one connection: its source ran and sent it, its target ran to handle it. */
export interface DeliverySignal {
  readonly sourceNodeId: string;
  readonly sourcePortId: string;
  readonly targetNodeId: string;
  readonly targetPortId: string;
}

function connectionKey(sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string): string {
  return `${portKey(sourceNodeId, sourcePortId)}->${portKey(targetNodeId, targetPortId)}`;
}

/** Injected clock + scheduler so the store is deterministic and testable. */
export interface LiveSignalStoreDeps {
  now(): number;
  schedule(cb: () => void): number;
  cancel(handle: number): void;
}

/** The browser's clock and frame scheduler, with fallbacks outside a browser. */
export const defaultLiveDeps: LiveSignalStoreDeps = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  schedule: cb =>
    typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame(cb)
      : // `window.setTimeout` returns a numeric handle (the DOM overload),
        // unlike the Node overload's `Timeout` object — this store deals in
        // numeric handles because it runs in the browser.
        window.setTimeout(cb, 16),
  cancel: h =>
    typeof cancelAnimationFrame !== 'undefined'
      ? cancelAnimationFrame(h)
      : window.clearTimeout(h),
};

export class LiveSignalStore {
  private readonly deps: LiveSignalStoreDeps;
  /** nodeId -> last-active timestamp. */
  private readonly nodeActiveAt = new Map<string, number>();
  /** nodeId set that errored during this run. */
  private readonly erroredNodes = new Set<string>();
  /** nodeId set that finished during this run (RFC 0001). */
  private readonly finishedNodes = new Set<string>();
  /** edgeId -> last-flowing timestamp. */
  private readonly edgeFlowAt = new Map<string, number>();
  /** Per-id listeners. */
  private readonly nodeListeners = new Map<string, Set<Listener>>();
  private readonly edgeListeners = new Map<string, Set<Listener>>();
  /** Snapshot of last-emitted state per id, so we only notify on real change. */
  private readonly lastNodeState = new Map<string, NodeLiveState>();
  private readonly lastEdgeFlowing = new Map<string, boolean>();
  /** Edges sourced by a given (nodeId@portId), for pulse -> edge mapping. */
  private edgesBySourcePort = new Map<string, EdgeIndexEntry[]>();
  /** Edges by the connection they carry (source port -> target port). */
  private edgesByConnection = new Map<string, EdgeIndexEntry[]>();
  /** How many messages each node has handled or sent, and each edge carried, this run. */
  private readonly nodePulse = new Map<string, number>();
  private readonly edgePulse = new Map<string, number>();
  /** The pulse counts last notified, so a new message notifies even while the state stays active. */
  private readonly lastNodePulse = new Map<string, number>();
  private readonly lastEdgePulse = new Map<string, number>();
  private rafHandle: number | null = null;
  private running = false;

  constructor(deps: LiveSignalStoreDeps = defaultLiveDeps) {
    this.deps = deps;
  }

  /** Provide the current edge index (call whenever edges change). */
  setEdgeIndex(edges: readonly EdgeIndexEntry[]): void {
    const next = new Map<string, EdgeIndexEntry[]>();
    for (const edge of edges) {
      const key = portKey(edge.sourceNodeId, edge.sourcePortId);
      const list = next.get(key);
      if (list === undefined) {
        next.set(key, [edge]);
      } else {
        list.push(edge);
      }
    }
    this.edgesBySourcePort = next;
    const byConnection = new Map<string, EdgeIndexEntry[]>();
    for (const edge of edges) {
      if (edge.targetNodeId !== undefined && edge.targetPortId !== undefined) {
        const key = connectionKey(edge.sourceNodeId, edge.sourcePortId, edge.targetNodeId, edge.targetPortId);
        byConnection.set(key, [...(byConnection.get(key) ?? []), edge]);
      }
    }
    this.edgesByConnection = byConnection;
  }

  /**
   * Record a message delivered on a connection, when it happens: its source
   * and its target each pulse once (each ran), and so does the edge that
   * carried it, and only that edge. Subscribers are notified on the next
   * frame, once however many messages arrived in it.
   */
  markDelivery(signal: DeliverySignal): void {
    const t = this.deps.now();
    for (const nodeId of [signal.sourceNodeId, signal.targetNodeId]) {
      this.nodeActiveAt.set(nodeId, t);
      this.nodePulse.set(nodeId, this.getNodePulse(nodeId) + 1);
    }
    const key = connectionKey(signal.sourceNodeId, signal.sourcePortId, signal.targetNodeId, signal.targetPortId);
    for (const edge of this.edgesByConnection.get(key) ?? []) {
      this.edgeFlowAt.set(edge.id, t);
      this.edgePulse.set(edge.id, this.getEdgePulse(edge.id) + 1);
    }
    this.ensureLoop();
  }

  /** How many messages a node has handled or sent this run; it changes each time the node runs. */
  getNodePulse(nodeId: string): number {
    return this.nodePulse.get(nodeId) ?? 0;
  }

  /** How many messages an edge has carried this run. */
  getEdgePulse(edgeId: string): number {
    return this.edgePulse.get(edgeId) ?? 0;
  }

  /** Record a node emitting on an output port (drives node + edge activity). */
  markActivity(nodeId: string, portId: string): void {
    const t = this.deps.now();
    this.nodeActiveAt.set(nodeId, t);
    const edges = this.edgesBySourcePort.get(portKey(nodeId, portId));
    if (edges !== undefined) {
      for (const edge of edges) {
        this.edgeFlowAt.set(edge.id, t);
      }
    }
    this.ensureLoop();
  }

  /** Record a node finishing (RFC 0001): shown once its last flash has faded. */
  markFinished(nodeId: string): void {
    this.finishedNodes.add(nodeId);
    this.ensureLoop();
  }

  /** Record a node erroring (sticky for the run). */
  markError(nodeId: string): void {
    this.erroredNodes.add(nodeId);
    this.ensureLoop();
  }

  /** Clear all live state (on stop/teardown) and notify everyone. */
  reset(): void {
    this.nodeActiveAt.clear();
    this.erroredNodes.clear();
    this.finishedNodes.clear();
    this.edgeFlowAt.clear();
    this.nodePulse.clear();
    this.edgePulse.clear();
    this.stopLoop();
    this.flushNotifications();
  }

  /** Subscribe to a single node's live state. */
  subscribeNode(nodeId: string, listener: Listener): () => void {
    return this.subscribe(this.nodeListeners, nodeId, listener);
  }

  /** Subscribe to a single edge's flowing state. */
  subscribeEdge(edgeId: string, listener: Listener): () => void {
    return this.subscribe(this.edgeListeners, edgeId, listener);
  }

  /** Current live state of a node. */
  getNodeState(nodeId: string): NodeLiveState {
    if (this.erroredNodes.has(nodeId)) {
      return 'error';
    }
    const at = this.nodeActiveAt.get(nodeId);
    if (at !== undefined && this.deps.now() - at <= ACTIVE_WINDOW_MS) {
      return 'active';
    }
    return this.finishedNodes.has(nodeId) ? 'finished' : 'idle';
  }

  /** Whether an edge is currently flowing. */
  isEdgeFlowing(edgeId: string): boolean {
    const at = this.edgeFlowAt.get(edgeId);
    return at !== undefined && this.deps.now() - at <= ACTIVE_WINDOW_MS;
  }

  private subscribe(
    registry: Map<string, Set<Listener>>,
    id: string,
    listener: Listener,
  ): () => void {
    const set = registry.get(id) ?? new Set<Listener>();
    set.add(listener);
    registry.set(id, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        registry.delete(id);
      }
    };
  }

  /**
   * Arms the frame loop if it is not running. Signals only record state; the
   * next frame notifies, so a burst of signals costs one pass over the
   * subscribers per frame, not one per signal, and every change shows within a
   * frame.
   */
  private ensureLoop(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    const step = (): void => {
      const stillLive = this.flushNotifications();
      if (stillLive) {
        this.rafHandle = this.deps.schedule(step);
      } else {
        this.running = false;
        this.rafHandle = null;
      }
    };
    this.rafHandle = this.deps.schedule(step);
  }

  private stopLoop(): void {
    if (this.rafHandle !== null) {
      this.deps.cancel(this.rafHandle);
      this.rafHandle = null;
    }
    this.running = false;
  }

  /**
   * Recompute every subscribed id's state, notify only those that changed, and
   * report whether anything is still within its active window (so the loop can
   * stop when the graph goes quiet).
   */
  private flushNotifications(): boolean {
    let anyLive = false;

    for (const [nodeId, listeners] of this.nodeListeners) {
      const state = this.getNodeState(nodeId);
      if (state !== 'idle') {
        anyLive = anyLive || state === 'active';
      }
      const pulse = this.getNodePulse(nodeId);
      if (this.lastNodeState.get(nodeId) !== state || this.lastNodePulse.get(nodeId) !== pulse) {
        this.lastNodeState.set(nodeId, state);
        this.lastNodePulse.set(nodeId, pulse);
        for (const listener of listeners) {
          listener();
        }
      }
    }

    for (const [edgeId, listeners] of this.edgeListeners) {
      const flowing = this.isEdgeFlowing(edgeId);
      anyLive = anyLive || flowing;
      const pulse = this.getEdgePulse(edgeId);
      if (this.lastEdgeFlowing.get(edgeId) !== flowing || this.lastEdgePulse.get(edgeId) !== pulse) {
        this.lastEdgeFlowing.set(edgeId, flowing);
        this.lastEdgePulse.set(edgeId, pulse);
        for (const listener of listeners) {
          listener();
        }
      }
    }

    return anyLive;
  }
}
