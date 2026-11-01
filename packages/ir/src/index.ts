/**
 * @hlang-org/ir
 *
 * The hlang intermediate representation. `IGraph` is the serialized program;
 * `planGraph` validates it and lowers it to an `ExecutionPlan`, the single
 * source of execution semantics shared by the interpreter and the compiler.
 */

export { ERROR_PORT_NAME } from './igraph';
export type {
  NodeKind,
  ParamValue,
  IParamObject,
  ParamBag,
  IBizData,
  IConnectionEndpoint,
  IConnection,
  IPortInfo,
  INodeInfo,
  IPackageInfo,
  IGraph,
} from './igraph';

export { planGraph, GraphError } from './plan';
export type {
  ExecutionPlan,
  PlannedNode,
  PlannedEndpoint,
  PlannedConnection,
  GraphErrorCode,
} from './plan';
