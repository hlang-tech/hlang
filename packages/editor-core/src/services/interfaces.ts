/**
 * Service interfaces and their DI identifiers.
 *
 * Every editor capability is expressed as an `I`-prefixed service behind a
 * `ServiceIdentifier`, so components depend on contracts (not implementations)
 * and tests can inject fakes. None of these expose React or RxJS.
 */

import { createDecorator } from '../di';
import type {
  EdgeBounds,
  EditorEdge,
  EditorNode,
  Endpoint,
  GraphSnapshot,
  NodeDescriptor,
  NodeId,
  EdgeId,
  ParamBag,
  PortDescriptor,
  Point,
} from '../model/types';

/** Result of a validation check. */
export interface ValidationResult {
  readonly ok: boolean;
  /** Machine-readable reason code when `ok` is false. */
  readonly reason?: string;
  /** Human-readable message when `ok` is false. */
  readonly message?: string;
}

/** A cancellable subscription. */
export interface IDisposable {
  dispose(): void;
}

// ---------------------------------------------------------------------------
// IEventBus
// ---------------------------------------------------------------------------

/** Discriminated union of editor events emitted on the bus. */
export type EditorEvent =
  | { readonly kind: 'nodeAdded'; readonly node: EditorNode }
  | { readonly kind: 'nodeRemoved'; readonly nodeId: NodeId }
  | { readonly kind: 'nodeChanged'; readonly node: EditorNode }
  | { readonly kind: 'edgeAdded'; readonly edge: EditorEdge }
  | { readonly kind: 'edgeRemoved'; readonly edgeId: EdgeId }
  | { readonly kind: 'edgeChanged'; readonly edge: EditorEdge }
  | { readonly kind: 'selectionChanged' }
  | { readonly kind: 'viewStateChanged' }
  | { readonly kind: 'historyChanged' };

export type EditorEventKind = EditorEvent['kind'];
export type EventOfKind<K extends EditorEventKind> = Extract<EditorEvent, { kind: K }>;

export interface IEventBus {
  emit(event: EditorEvent): void;
  on<K extends EditorEventKind>(
    kind: K,
    listener: (event: EventOfKind<K>) => void,
  ): IDisposable;
}
export const IEventBus = createDecorator<IEventBus>('eventBus');

// ---------------------------------------------------------------------------
// IGraphModel
// ---------------------------------------------------------------------------

export interface IGraphModel {
  getNode(id: NodeId): EditorNode | undefined;
  getEdge(id: EdgeId): EditorEdge | undefined;
  getNodes(): readonly EditorNode[];
  getEdges(): readonly EditorEdge[];
  addNode(node: EditorNode): void;
  /** Remove a node and cascade-remove its incident edges. */
  removeNode(id: NodeId): void;
  updateNodeParams(id: NodeId, params: ParamBag): void;
  updateNodePosition(id: NodeId, position: Point): void;
  updateNodeName(id: NodeId, name: string): void;
  addEdge(edge: EditorEdge): void;
  removeEdge(id: EdgeId): void;
  /** Replace an edge's capacity and overflow; absent fields leave it unbounded. */
  updateEdgeBounds(id: EdgeId, bounds: EdgeBounds): void;
  /** All edges touching `nodeId` on either endpoint. */
  incidentEdges(nodeId: NodeId): readonly EditorEdge[];
  snapshot(): GraphSnapshot;
  restore(snapshot: GraphSnapshot): void;
}
export const IGraphModel = createDecorator<IGraphModel>('graphModel');

// ---------------------------------------------------------------------------
// IConnectionValidator
// ---------------------------------------------------------------------------

export interface IConnectionValidator {
  /** Decide whether an edge from `source` (O) to `target` (I) is legal. */
  validate(source: Endpoint, target: Endpoint, model: IGraphModel): ValidationResult;
  /**
   * Decide whether two ports COULD be linked, based only on the ports
   * themselves (direction + DTO compatibility) — independent of any graph
   * model. Used by design-time affordances such as "which node types can
   * complete this dangling connection?", where the candidate node does not
   * exist yet. This is the model-free subset of {@link validate}'s rules;
   * `validate` additionally enforces node existence and the duplicate-edge
   * rule, which only make sense against a concrete graph.
   */
  canLink(sourcePort: PortDescriptor, targetPort: PortDescriptor): ValidationResult;
}
export const IConnectionValidator = createDecorator<IConnectionValidator>('connectionValidator');

// ---------------------------------------------------------------------------
// INodeRegistry (design-time)
// ---------------------------------------------------------------------------

export interface INodeRegistry {
  register(descriptor: NodeDescriptor): void;
  get(code: string): NodeDescriptor | undefined;
  list(filter?: { readonly group?: string }): readonly NodeDescriptor[];
  /** Create a node instance from a descriptor's defaults at `position`. */
  createNode(code: string, position: Point): EditorNode;
}
export const INodeRegistry = createDecorator<INodeRegistry>('nodeRegistry');

// ---------------------------------------------------------------------------
// ISelectionService
// ---------------------------------------------------------------------------

export type SelectionMode = 'replace' | 'add' | 'toggle';

export interface ISelectionService {
  getSelectedNodes(): ReadonlySet<NodeId>;
  getSelectedEdges(): ReadonlySet<EdgeId>;
  selectNodes(ids: readonly NodeId[], mode: SelectionMode): void;
  selectEdges(ids: readonly EdgeId[], mode: SelectionMode): void;
  isSelected(id: NodeId | EdgeId): boolean;
  clear(): void;
}
export const ISelectionService = createDecorator<ISelectionService>('selectionService');

// ---------------------------------------------------------------------------
// IViewStateService
// ---------------------------------------------------------------------------

/**
 * Per-node, editor-only view flags (`hidden`, `locked`). Never serialized into
 * IGraph; a presentation concern mirrored into the canvas by the binding layer.
 */
export interface IViewStateService {
  getHiddenNodes(): ReadonlySet<NodeId>;
  getLockedNodes(): ReadonlySet<NodeId>;
  isHidden(id: NodeId): boolean;
  isLocked(id: NodeId): boolean;
  setHidden(id: NodeId, hidden: boolean): void;
  setLocked(id: NodeId, locked: boolean): void;
  clear(): void;
}
export const IViewStateService = createDecorator<IViewStateService>('viewStateService');

// ---------------------------------------------------------------------------
// IDiagnosticsService (edit-time semantic validation)
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = 'error' | 'warning';

/**
 * Edit-time diagnostic codes. `error` = the runtime would actually throw;
 * `warning` = predictive (runtime tolerates but the node does nothing).
 */
export type DiagnosticCode =
  | 'dead-source' // R output feeds nothing (warning)
  | 'dangling-input' // T input unconnected (warning — runtime no-ops)
  | 'sink-no-upstream' // W input unconnected (warning)
  | 'bad-connection' // an edge is wrong-direction / illegal (error)
  | 'type-mismatch' // an edge links incompatible port types (warning)
  | 'no-source-root' // graph has nodes but no R node to run (error)
  | 'unregistered-code'; // node's code is not in the registry (error)

export interface Diagnostic {
  /** Stable id for keying (code + target). */
  readonly id: string;
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly nodeId?: NodeId;
  readonly edgeId?: EdgeId;
}

export interface IDiagnosticsService {
  /** Current diagnostics for the whole graph, recomputed on structural change. */
  getDiagnostics(): readonly Diagnostic[];
  /** Subscribe to "diagnostics changed"; returns a disposer. */
  onChanged(listener: () => void): IDisposable;
  /**
   * Monotonic change signal, bumped on every graph change that may affect
   * diagnostics (recompute itself is lazy — see `getDiagnostics`). Reactive
   * readers use it as a cheap "something changed" token.
   */
  readonly version: number;
}
export const IDiagnosticsService = createDecorator<IDiagnosticsService>('diagnosticsService');

// ---------------------------------------------------------------------------
// ICommandService + IHistoryService
// ---------------------------------------------------------------------------

/** Context handed to a command's execute/undo. */
export interface CommandContext {
  readonly model: IGraphModel;
  readonly validator: IConnectionValidator;
  readonly bus: IEventBus;
  /** Per-node view flags (hidden/locked); mutated by view-state commands. */
  readonly viewState: IViewStateService;
}

/** A reversible editor command. */
export interface IEditorCommand<R = void> {
  readonly kind: string;
  readonly label: string;
  execute(ctx: CommandContext): R;
  undo(ctx: CommandContext): void;
}

export interface CommandResult<R> {
  readonly ok: boolean;
  readonly value?: R;
  readonly error?: ValidationResult;
}

export interface ICommandService {
  execute<R>(command: IEditorCommand<R>): CommandResult<R>;
}
export const ICommandService = createDecorator<ICommandService>('commandService');

export interface IHistoryService {
  canUndo(): boolean;
  canRedo(): boolean;
  push(command: IEditorCommand): void;
  undo(): void;
  redo(): void;
  /** Group multiple commands executed in `fn` into one undo entry. */
  transact(label: string, fn: () => void): void;
  clear(): void;
}
export const IHistoryService = createDecorator<IHistoryService>('historyService');
