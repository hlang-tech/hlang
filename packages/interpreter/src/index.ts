/**
 * @hlang-org/interpreter
 *
 * In-process interpreter for hlang's `IGraph` intermediate representation.
 * Evaluates a serialized graph into a live, RxJS-backed reactive object graph
 * and runs it — no code generation, no child process, no file IO.
 */

export { interpret } from './interpreter';
export type { IInterpreterDeps } from './interpreter';

export { NodeRegistry } from './registry';
export type { INodeRegistry } from './registry';

export { ERROR_PORT_NAME } from './runtime-contract';
export type {
  StreamType,
  NodeKind,
  IRuntimePort,
  IRuntimeNode,
  IRuntimeFlow,
  FlowFactory,
  NodeConstructor,
  INodeConstructionOptions,
} from './runtime-contract';

export type {
  IGraph,
  IConnection,
  IConnectionEndpoint,
  INodeInfo,
  IBizData,
  IPortInfo,
  IPackageInfo,
  ParamBag,
  ParamValue,
} from './igraph';

export type {
  IDisposable,
  INodeErrorEvent,
  INodeActivityEvent,
  IInterpretOptions,
  IExecutionHandle,
} from './types';
