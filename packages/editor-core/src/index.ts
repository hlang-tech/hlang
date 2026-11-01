/**
 * @hlang-org/editor-core
 *
 * Headless, framework-agnostic core for the hlang visual editor. Zero React,
 * zero pixels, zero RxJS in its public surface. Provides the graph model,
 * command/undo system, selection, connection validation, the design-time node
 * registry, and IGraph serialization — all behind DI service interfaces.
 */

// Composition root
export { createEditorCore } from './editor';
export type { EditorCore, CreateEditorCoreOptions } from './editor';

// Dependency injection
export {
  createDecorator,
  getServiceDependencies,
  ServiceCollection,
  InstantiationService,
} from './di';
export type { ServiceIdentifier, IServiceDependency, Newable } from './di';

// Domain model
export { ERROR_PORT_NAME } from './model/types';
export type {
  NodeId,
  EdgeId,
  PortId,
  NodeKind,
  PortDirection,
  Point,
  ParamValue,
  IParamObject,
  ParamBag,
  DataType,
  PortDescriptor,
  NodeDescriptor,
  EditorNode,
  Endpoint,
  EditorEdge,
  GraphSnapshot,
} from './model/types';

// Service interfaces + identifiers
export {
  IEventBus,
  IGraphModel,
  IConnectionValidator,
  INodeRegistry,
  ISelectionService,
  IViewStateService,
  IDiagnosticsService,
  ICommandService,
  IHistoryService,
} from './services/interfaces';
export type {
  ValidationResult,
  IDisposable,
  EditorEvent,
  EditorEventKind,
  EventOfKind,
  CommandContext,
  IEditorCommand,
  CommandResult,
  SelectionMode,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticCode,
} from './services/interfaces';
export { ISerializationService } from './services/serialization-interface';
export type { ISerializationService as ISerializationServiceType } from './services/serialization-interface';
export { IIdGenerator, CountingIdGenerator } from './services/id-generator';
export type { IIdGenerator as IIdGeneratorType } from './services/id-generator';
export { ICommandContextProvider } from './services/history-service';
export type { ICommandContextProvider as ICommandContextProviderType } from './services/history-service';

// Concrete services (exported so consumers can compose custom containers)
export { EventBus } from './services/event-bus';
export { GraphModel } from './services/graph-model';
export { ConnectionValidator } from './services/connection-validator';
export { NodeRegistry } from './services/node-registry';
export { SelectionService } from './services/selection-service';
export { ViewStateService } from './services/view-state-service';
export { DiagnosticsService } from './services/diagnostics-service';
export { cloneNodesWithEdges } from './services/clone-nodes';
export type { CloneOffset, CloneResult } from './services/clone-nodes';
export { planInsertOnEdge, distanceToSegment } from './services/reroute';
export type { InsertPlan } from './services/reroute';
export { SerializationService } from './services/serialization-service';
export { HistoryService } from './services/history-service';
export { CommandContextProvider } from './services/context-provider';
export { CommandService, CommandValidationError } from './services/command-service';
export {
  IExecutionService,
  IGraphRunner,
  ExecutionService,
} from './services/execution-service';
export type {
  IExecutionHandle,
  IExecutionService as IExecutionServiceType,
  IGraphRunner as IGraphRunnerType,
} from './services/execution-service';
export { InterpreterGraphRunner } from './services/interpreter-runner';
// Re-export the runtime signal event types so UI layers consume them without
// importing @hlang-org/interpreter directly.
export type { INodeErrorEvent, INodeActivityEvent } from '@hlang-org/interpreter';

// Commands
export {
  AddNodeCommand,
  RemoveNodeCommand,
  ConnectCommand,
  DisconnectCommand,
  MoveNodeCommand,
  UpdateParamsCommand,
  SetHiddenCommand,
  SetLockedCommand,
  RenameNodeCommand,
} from './commands/commands';

// Graph topology analysis (living subgraphs + edit-time lint), computed from
// the O->I connection topology — no separate stored group model.
export { GraphTopology, classifyInterface } from './services/graph-topology';
export type {
  TopologyComponent,
  SubgraphInterface,
  LintCode,
  LintDiagnostic,
} from './services/graph-topology';
export { TopologyIndex } from './services/topology-index';

// Layered (Sugiyama-style) auto-layout: topology -> tidy coordinates.
export { layoutLayered } from './services/layered-layout';
export type { LayoutEdge, LayoutOptions, LayoutPoint } from './services/layered-layout';
// Group-aware layout: each group a compact block, blocks packed disjoint.
export { layoutGrouped } from './services/grouped-layout';
export type { LayoutGroup, GroupedLayoutOptions } from './services/grouped-layout';

// Explicit-membership groups (editor sidecar; never part of the IGraph IR).
export { GroupModel } from './services/group-model';
export type {
  GroupId,
  EditorGroup,
  CreateGroupInput,
  GroupSidecar,
} from './services/group-model';
