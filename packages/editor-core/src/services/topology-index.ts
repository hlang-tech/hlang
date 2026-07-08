/**
 * `TopologyIndex` — keeps a `GraphTopology` synchronized with the live graph by
 * subscribing to the editor event bus, so components and lint diagnostics are
 * always current without any consumer re-scanning the graph.
 *
 * Incremental by construction: node/edge add/remove events map to the matching
 * O(1)/O(degree) topology mutation. Bulk loads (importing a whole IGraph via
 * `model.restore`) don't emit per-element events, so `reindex()` rebuilds the
 * index from the model in one O(V+E) pass — call it after a bulk load.
 *
 * Headless: this holds no React/DOM. UI layers read `topology` (or subscribe to
 * `onChanged`) and render; they never mutate it directly.
 */

import type { IDisposable, IEventBus, IGraphModel } from './interfaces';
import { GraphTopology } from './graph-topology';

export class TopologyIndex {
  private readonly topo = new GraphTopology();
  private readonly subscriptions: IDisposable[] = [];
  private readonly changeListeners = new Set<() => void>();
  /** Monotonic change counter, so reactive readers can detect updates cheaply. */
  private changeVersion = 0;

  constructor(
    private readonly model: IGraphModel,
    bus: IEventBus,
  ) {
    this.reindex();
    this.subscriptions.push(
      bus.on('nodeAdded', event => {
        this.topo.addNode(event.node);
        this.notify();
      }),
      bus.on('nodeRemoved', event => {
        this.topo.removeNode(event.nodeId);
        this.notify();
      }),
      bus.on('edgeAdded', event => {
        this.topo.addEdge(event.edge);
        this.notify();
      }),
      bus.on('edgeRemoved', event => {
        this.topo.removeEdge(event.edgeId);
        this.notify();
      }),
    );
  }

  /** The maintained topology (query components / componentOf / lint on it). */
  get topology(): GraphTopology {
    return this.topo;
  }

  /** Monotonic version, bumped on every change — a cheap reactive snapshot. */
  get version(): number {
    return this.changeVersion;
  }

  /** Rebuild the whole index from the current model (after a bulk load/reset). */
  reindex(): void {
    this.topo.reset(this.model.getNodes(), this.model.getEdges());
    this.notify();
  }

  /** Subscribe to "topology changed" (debounced by the caller if desired). */
  onChanged(listener: () => void): IDisposable {
    this.changeListeners.add(listener);
    return {
      dispose: (): void => {
        this.changeListeners.delete(listener);
      },
    };
  }

  dispose(): void {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions.length = 0;
    this.changeListeners.clear();
  }

  private notify(): void {
    this.changeVersion += 1;
    for (const listener of [...this.changeListeners]) {
      listener();
    }
  }
}
