/**
 * Composition root: assemble the editor's services into a container and expose
 * a small facade. This is the single place that knows concrete implementations;
 * everything else depends only on the service interfaces.
 *
 * Services are constructed in dependency order. The would-be cycle between the
 * command and history services is broken by `CommandContextProvider`, which
 * both depend on but which itself depends only on model/validator/bus.
 */

import { InstantiationService, ServiceCollection } from './di';
import { GraphModel } from './services/graph-model';
import { EventBus } from './services/event-bus';
import { ConnectionValidator } from './services/connection-validator';
import { NodeRegistry } from './services/node-registry';
import { SelectionService } from './services/selection-service';
import { ViewStateService } from './services/view-state-service';
import { DiagnosticsService } from './services/diagnostics-service';
import { SerializationService } from './services/serialization-service';
import { CommandService } from './services/command-service';
import { HistoryService } from './services/history-service';
import { CommandContextProvider } from './services/context-provider';
import {
  CountingIdGenerator,
  IIdGenerator,
} from './services/id-generator';
import { ICommandContextProvider } from './services/history-service';
import {
  ICommandService,
  IConnectionValidator,
  IEventBus,
  IGraphModel,
  IHistoryService,
  INodeRegistry,
  ISelectionService,
  IViewStateService,
  IDiagnosticsService,
  IEditorModeService,
} from './services/interfaces';
import type { IEditorModeService as IEditorModeServiceType } from './services/interfaces';
import { EditorModeService } from './services/editor-mode-service';
import { ISerializationService } from './services/serialization-interface';
import { ExecutionService, IExecutionService, IGraphRunner } from './services/execution-service';
import type {
  IExecutionService as IExecutionServiceType,
  IGraphRunner as IGraphRunnerType,
} from './services/execution-service';
import type { IIdGenerator as IIdGeneratorType } from './services/id-generator';

/** The assembled editor: the DI container plus its resolved core services. */
export interface EditorCore {
  readonly services: ServiceCollection;
  readonly instantiation: InstantiationService;
  readonly model: IGraphModel;
  readonly commands: ICommandService;
  readonly history: IHistoryService;
  readonly selection: ISelectionService;
  /** Per-node view flags (hidden/locked); reflected into the canvas, not IGraph. */
  readonly viewState: IViewStateService;
  /** Edit-time semantic diagnostics (reuses validator + topology); not IGraph. */
  readonly diagnostics: IDiagnosticsService;
  readonly registry: INodeRegistry;
  readonly serialization: ISerializationService;
  readonly validator: IConnectionValidator;
  readonly events: IEventBus;
  /** The id generation strategy, exposed so consumers avoid container lookups. */
  readonly idGenerator: IIdGeneratorType;
  /** Present only when a graph runner was supplied. */
  readonly execution?: IExecutionServiceType;
  /** Whether the editor may change the graph; read-only refuses every command. */
  readonly mode: IEditorModeServiceType;
}

/** Options for assembling an editor core. */
export interface CreateEditorCoreOptions {
  /** Override the id generation strategy (e.g. for deterministic tests). */
  readonly idGenerator?: IIdGeneratorType;
  /**
   * Supply a graph runner (e.g. an `InterpreterGraphRunner`) to enable the
   * execution service. Omitted when the editor is used purely for authoring.
   */
  readonly graphRunner?: IGraphRunnerType;
  /** Start read-only: the graph can be shown, run and inspected, not changed. */
  readonly readOnly?: boolean;
}

/** Assemble a fully wired editor core. */
export function createEditorCore(options: CreateEditorCoreOptions = {}): EditorCore {
  const services = new ServiceCollection();
  const instantiation = new InstantiationService(services);

  // Leaf services (no editor-service dependencies).
  const events = new EventBus();
  services.set(IEventBus, events);

  const model = new GraphModel();
  services.set(IGraphModel, model);

  const validator = new ConnectionValidator();
  services.set(IConnectionValidator, validator);

  const idGenerator = options.idGenerator ?? new CountingIdGenerator();
  services.set(IIdGenerator, idGenerator);

  const serialization = new SerializationService();
  services.set(ISerializationService, serialization);

  // Services with dependencies — built via the instantiation service so their
  // decorated constructor parameters are injected from the collection.
  const registry = instantiation.createInstance(NodeRegistry);
  services.set(INodeRegistry, registry);

  const selection = instantiation.createInstance(SelectionService);
  services.set(ISelectionService, selection);

  const viewState = instantiation.createInstance(ViewStateService);
  services.set(IViewStateService, viewState);

  const diagnostics = instantiation.createInstance(DiagnosticsService);
  services.set(IDiagnosticsService, diagnostics);

  const mode = instantiation.createInstance(EditorModeService);
  services.set(IEditorModeService, mode);
  mode.setReadOnly(options.readOnly ?? false);

  const contextProvider = instantiation.createInstance(CommandContextProvider);
  services.set(ICommandContextProvider, contextProvider);

  const history = instantiation.createInstance(HistoryService);
  services.set(IHistoryService, history);

  const commands = instantiation.createInstance(CommandService);
  services.set(ICommandService, commands);

  // Optional execution service, only when a runner is supplied.
  let execution: IExecutionServiceType | undefined;
  if (options.graphRunner !== undefined) {
    services.set(IGraphRunner, options.graphRunner);
    execution = instantiation.createInstance(ExecutionService);
    services.set(IExecutionService, execution);
  }

  return {
    services,
    instantiation,
    model,
    commands,
    history,
    selection,
    viewState,
    diagnostics,
    registry,
    serialization,
    validator,
    events,
    idGenerator,
    mode,
    ...(execution !== undefined ? { execution } : {}),
  };
}
