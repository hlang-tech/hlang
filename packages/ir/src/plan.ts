/**
 * `planGraph` validates an `IGraph` and lowers it to an `ExecutionPlan`.
 *
 * The plan is the single definition of hlang's execution semantics:
 *   1. construct every node with `config` (its `bizData`, default `{ params: {} }`);
 *   2. wire each connection as `source.O(portId).connect(target.I(portId))`;
 *   3. run every Readable root with a runtime `Flow`.
 *
 * `@hlang-org/interpreter` executes the plan in-process and
 * `@hlang-org/compiler` emits the same steps as an ES module, so both backends
 * share one set of rules and one set of errors.
 */

import { ERROR_PORT_NAME } from './igraph';
import type { ConnectionOverflow, IConnection, IConnectionEndpoint, IGraph, INodeInfo, NodeKind } from './igraph';

/** A node to construct. `config` is passed to the node constructor. */
export interface PlannedNode {
  readonly nodeId: string;
  readonly code: string;
  readonly kind: NodeKind;
  readonly config: Readonly<Record<string, unknown>>;
}

/** One end of a planned connection. */
export interface PlannedEndpoint {
  readonly nodeId: string;
  readonly portId: string;
}

/** `source` is an output (O) port; `target` is an input (I) port. */
export interface PlannedConnection {
  readonly source: PlannedEndpoint;
  readonly target: PlannedEndpoint;
  /** Present only on a bounded connection. */
  readonly capacity?: number;
  readonly overflow?: ConnectionOverflow;
}

/** A validated, backend-neutral program. */
export interface ExecutionPlan {
  /** Nodes in graph order. */
  readonly nodes: readonly PlannedNode[];
  /** Connections in graph order. */
  readonly connections: readonly PlannedConnection[];
  /** Node ids of the Readable roots, in graph order. Never empty. */
  readonly roots: readonly string[];
}

/** Machine-readable reasons a graph cannot be planned. */
export type GraphErrorCode =
  | 'duplicate-node-id'
  | 'invalid-node-kind'
  | 'unknown-node'
  | 'invalid-connection'
  | 'no-readable-root';

/** Thrown by `planGraph` when a graph violates hlang's rules. */
export class GraphError extends Error {
  readonly code: GraphErrorCode;

  constructor(code: GraphErrorCode, message: string) {
    super(message);
    this.name = 'GraphError';
    this.code = code;
  }
}

const DEFAULT_SOURCE_PORT = 'Output';
const DEFAULT_TARGET_PORT = 'Input';

/** Validate `graph` and lower it to an `ExecutionPlan`. */
export function planGraph(graph: IGraph): ExecutionPlan {
  const kinds = new Map<string, NodeKind>();
  const nodes: PlannedNode[] = [];
  const roots: string[] = [];

  for (const info of graph.nodeList) {
    if (kinds.has(info.nodeId)) {
      throw new GraphError('duplicate-node-id', `Node id "${info.nodeId}" is used more than once.`);
    }
    const kind = kindOf(info);
    kinds.set(info.nodeId, kind);
    nodes.push({ nodeId: info.nodeId, code: info.code, kind, config: configOf(info) });
    if (kind === 'R') {
      roots.push(info.nodeId);
    }
  }

  const connections = graph.connections.map((connection): PlannedConnection => {
    const source = endpointOf(connection.Output, DEFAULT_SOURCE_PORT);
    const target = endpointOf(connection.Input, DEFAULT_TARGET_PORT);
    const sourceKind = kinds.get(source.nodeId);
    const targetKind = kinds.get(target.nodeId);
    if (sourceKind === undefined || targetKind === undefined) {
      throw new GraphError(
        'unknown-node',
        `A connection references an unknown node (source "${source.nodeId}", target "${target.nodeId}").`,
      );
    }
    if (sourceKind === 'W') {
      throw new GraphError(
        'invalid-connection',
        `Writable node "${source.nodeId}" has no output ports and cannot be a connection source.`,
      );
    }
    if (targetKind === 'R') {
      throw new GraphError(
        'invalid-connection',
        `Readable node "${target.nodeId}" has no input ports and cannot be a connection target.`,
      );
    }
    if (target.portId === ERROR_PORT_NAME) {
      throw new GraphError(
        'invalid-connection',
        `"${ERROR_PORT_NAME}" is an output port and cannot be a connection target (node "${target.nodeId}").`,
      );
    }
    return { source, target, ...boundsOf(connection, source, target) };
  });

  if (roots.length === 0) {
    throw new GraphError('no-readable-root', 'The graph has no Readable (R) node to run.');
  }

  return { nodes, connections, roots };
}

/** A JSON value as it appears in the graph, for an error message. */
function describe(value: unknown): string {
  return JSON.stringify(value) ?? typeof value;
}

/**
 * A connection's capacity and overflow, checked at run time: a graph arrives
 * as JSON, where the types only document what is valid.
 */
function boundsOf(
  connection: IConnection,
  source: PlannedEndpoint,
  target: PlannedEndpoint,
): { readonly capacity?: number; readonly overflow?: ConnectionOverflow } {
  const capacity: unknown = connection.capacity;
  const overflow: unknown = connection.overflow;
  const where = `"${source.nodeId}.${source.portId}" -> "${target.nodeId}.${target.portId}"`;
  if (capacity === undefined) {
    if (overflow !== undefined) {
      throw new GraphError('invalid-connection', `Connection ${where} sets an overflow without a capacity.`);
    }
    return {};
  }
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1) {
    throw new GraphError('invalid-connection', `Connection ${where} has capacity ${describe(capacity)}; expected a positive integer.`);
  }
  if (overflow === undefined) {
    return { capacity };
  }
  if (overflow !== 'drop-oldest') {
    throw new GraphError('invalid-connection', `Connection ${where} has overflow ${describe(overflow)}; expected "drop-oldest".`);
  }
  return { capacity, overflow };
}

function isNodeKind(value: unknown): value is NodeKind {
  return value === 'R' || value === 'T' || value === 'W';
}

/** Read the node kind; `type` is untrusted JSON, so it is checked at runtime. */
function kindOf(info: INodeInfo): NodeKind {
  const kind: unknown = info.type;
  if (isNodeKind(kind)) {
    return kind;
  }
  throw new GraphError(
    'invalid-node-kind',
    `Node "${info.nodeId}" has kind "${String(kind)}"; expected "R", "T", or "W".`,
  );
}

/** The constructor `config`: a copy of `bizData`, with `params` defaulted. */
function configOf(info: INodeInfo): Readonly<Record<string, unknown>> {
  const bizData = info.bizData;
  if (bizData === undefined) {
    return { params: {} };
  }
  return { ...bizData, params: bizData.params ?? {} };
}

/** Resolve the port id from `portConf.id`, the legacy `portConfig.id`, or a default. */
function endpointOf(endpoint: IConnectionEndpoint, fallbackPort: string): PlannedEndpoint {
  const legacyId = endpoint.portConfig?.id;
  const portId =
    endpoint.portConf?.id ?? (typeof legacyId === 'string' ? legacyId : undefined) ?? fallbackPort;
  return { nodeId: endpoint.nodeId, portId };
}
