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
export type NodeLiveState = 'idle' | 'active' | 'error';

/** How long a node/edge stays "active" after its last emission (ms). */
const ACTIVE_WINDOW_MS = 700;

type Listener = () => void;

/** Composite key for a specific output port on a node. */
function portKey(nodeId: string, portId: string): string {
  return `${nodeId}@${portId}`;
}

/** Minimal edge shape the store needs to map a source-port pulse to edges. */
export interface EdgeIndexEntry {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly sourcePortId: string;
  readonly isError: boolean;
}

/** Injected clock + scheduler so the store is deterministic and testable. */
export interface LiveSignalStoreDeps {
  now(): number;
  schedule(cb: () => void): number;
  cancel(handle: number): void;
}

const defaultDeps: LiveSignalStoreDeps = {
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
  private rafHandle: number | null = null;
  private running = false;

  constructor(deps: LiveSignalStoreDeps = defaultDeps) {
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

  /** Record a node erroring (sticky for the run). */
  markError(nodeId: string): void {
    this.erroredNodes.add(nodeId);
    this.ensureLoop();
  }

  /** Clear all live state (on stop/teardown) and notify everyone. */
  reset(): void {
    this.nodeActiveAt.clear();
    this.erroredNodes.clear();
    this.edgeFlowAt.clear();
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
    return 'idle';
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
      if (this.lastNodeState.get(nodeId) !== state) {
        this.lastNodeState.set(nodeId, state);
        for (const listener of listeners) {
          listener();
        }
      }
    }

    for (const [edgeId, listeners] of this.edgeListeners) {
      const flowing = this.isEdgeFlowing(edgeId);
      anyLive = anyLive || flowing;
      if (this.lastEdgeFlowing.get(edgeId) !== flowing) {
        this.lastEdgeFlowing.set(edgeId, flowing);
        for (const listener of listeners) {
          listener();
        }
      }
    }

    return anyLive;
  }
}
