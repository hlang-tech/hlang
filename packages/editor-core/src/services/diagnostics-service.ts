/**
 * `DiagnosticsService` — edit-time semantic validation. It answers "what is
 * wrong with this graph right now, before running it?" by REUSING the existing
 * rule engines rather than re-encoding them:
 *   - `GraphTopology.lint()` for structural problems (dead source, dangling
 *     transform input, sink with no upstream)
 *   - `ConnectionValidator.validate()` for per-edge legality (bad direction,
 *     type mismatch)
 *   - the interpreter's own hard rules it can't run without (no R root,
 *     unregistered node code)
 *
 * Severity follows the runtime's truth: an `error` is something the runtime
 * would actually THROW on; a `warning` is predictive — the runtime tolerates it
 * but the node silently does nothing (e.g. an unconnected input). Diagnostics
 * are a view concern: never serialized into IGraph.
 *
 * Headless and event-driven: it rebuilds a `GraphTopology` from the model on any
 * structural event and notifies subscribers, mirroring `TopologyIndex`.
 */

import type {
  Diagnostic,
  IConnectionValidator,
  IDiagnosticsService,
  IDisposable,
  IEventBus,
  IGraphModel,
  INodeRegistry,
} from './interfaces';
import { IConnectionValidator as IConnectionValidatorId, IEventBus as IEventBusId, IGraphModel as IGraphModelId, INodeRegistry as INodeRegistryId } from './interfaces';
import { GraphTopology } from './graph-topology';

/** Structural events after which diagnostics must be recomputed. */
const STRUCTURAL = ['nodeAdded', 'nodeRemoved', 'nodeChanged', 'edgeAdded', 'edgeRemoved'] as const;

export class DiagnosticsService implements IDiagnosticsService {
  private readonly subscriptions: IDisposable[] = [];
  private readonly changeListeners = new Set<() => void>();
  private changeVersion = 0;
  private cache: readonly Diagnostic[] = [];
  private dirty = true;

  constructor(
    @IGraphModelId private readonly model: IGraphModel,
    @IEventBusId bus: IEventBus,
    @IConnectionValidatorId private readonly validator: IConnectionValidator,
    @INodeRegistryId private readonly registry: INodeRegistry,
  ) {
    for (const kind of STRUCTURAL) {
      this.subscriptions.push(
        bus.on(kind, () => {
          this.dirty = true;
          this.notify();
        }),
      );
    }
  }

  get version(): number {
    return this.changeVersion;
  }

  getDiagnostics(): readonly Diagnostic[] {
    if (this.dirty) {
      this.cache = this.compute();
      this.dirty = false;
    }
    return this.cache;
  }

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

  /** Recompute all diagnostics from the current model. */
  private compute(): readonly Diagnostic[] {
    const nodes = this.model.getNodes();
    const edges = this.model.getEdges();
    const out: Diagnostic[] = [];

    // 1. Structural lint (reuse GraphTopology). The topology marks dangling/sink
    //    as 'error', but per our severity model those are PREDICTIVE (runtime
    //    tolerates) → downgrade to warning; dead-source is already a warning.
    const topo = new GraphTopology();
    topo.reset(nodes, edges);
    for (const d of topo.lint()) {
      // All structural lint (dead-source / dangling-input / sink-no-upstream) is
      // PREDICTIVE — the runtime tolerates it and the node just no-ops — so it
      // surfaces as a warning regardless of the topology's own severity.
      out.push({
        id: `${d.code}:${d.nodeId}`,
        code: d.code,
        severity: 'warning',
        message: d.message,
        nodeId: d.nodeId,
      });
    }

    // 2. Per-edge legality (reuse ConnectionValidator). Bad direction is a hard
    //    runtime throw (error); type mismatch is editor-stricter-than-runtime
    //    (warning). Duplicate/self/missing shouldn't occur post-commit.
    for (const edge of edges) {
      const res = this.validator.validate(edge.source, edge.target, this.model);
      // A committed edge is (by definition) present in the model, so the
      // validator's `duplicate` rule always fires for it — that's not a defect,
      // so ignore it here. `ok` edges are fine too.
      if (res.ok || res.reason === 'duplicate') {
        continue;
      }
      if (res.reason === 'type-mismatch') {
        out.push({
          id: `type-mismatch:${edge.id}`,
          code: 'type-mismatch',
          severity: 'warning',
          message: res.message ?? 'Incompatible port types.',
          edgeId: edge.id,
        });
      } else {
        // bad-direction, or any other non-ok reason (missing-port/self/etc.).
        // Never silently swallow an invalid edge — surface it as a hard error.
        out.push({
          id: `bad-connection:${edge.id}`,
          code: 'bad-connection',
          severity: 'error',
          message: res.message ?? 'Illegal connection.',
          edgeId: edge.id,
        });
      }
    }

    // 3. Interpreter hard rules the graph cannot run without.
    if (nodes.length > 0) {
      const hasRoot = nodes.some(n => n.kind === 'R');
      if (!hasRoot) {
        out.push({
          id: 'no-source-root',
          code: 'no-source-root',
          severity: 'error',
          message: 'The graph has no Readable (R) node to run.',
        });
      }
    }
    for (const node of nodes) {
      if (this.registry.get(node.code) === undefined) {
        out.push({
          id: `unregistered-code:${node.id}`,
          code: 'unregistered-code',
          severity: 'error',
          message: `No node is registered for code "${node.code}".`,
          nodeId: node.id,
        });
      }
    }

    return out;
  }
}
