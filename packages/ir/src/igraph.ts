/**
 * The `IGraph` intermediate representation — hlang's serialized graph format.
 *
 * `IGraph` is the program text of hlang, encoded as JSON. The same `IGraph`
 * is executed in-process by `@hlang-org/interpreter` or compiled to an ES
 * module by `@hlang-org/compiler`; both consume it through `planGraph`.
 *
 * Strictly typed with zero `any`: opaque, node-defined data is `unknown`.
 */

/** The three hlang node kinds: Readable (source), Transform, Writable (sink). */
export type NodeKind = 'R' | 'T' | 'W';

/** The output port every Readable and Transform node exposes for errors. */
export const ERROR_PORT_NAME = '@node/error';

/** Serialized parameter values carried in `bizData.params`. */
export type ParamValue =
  | string
  | number
  | boolean
  | null
  | readonly ParamValue[]
  | IParamObject;

/**
 * Object-valued parameters. Declared as an interface (not a `Record` alias) so
 * the recursive `ParamValue` reference resolves without a circular-alias error.
 */
export interface IParamObject {
  readonly [key: string]: ParamValue;
}

/** A bag of node parameters (the `params` object under `bizData`). */
export type ParamBag = Readonly<Record<string, ParamValue>>;

/** Business data attached to a node; `params` is the user-facing config. */
export interface IBizData {
  readonly flowId?: string;
  readonly nodeId?: string;
  readonly params?: ParamBag;
  readonly [key: string]: unknown;
}

/** One endpoint of a connection, as serialized. */
export interface IConnectionEndpoint {
  readonly name?: string;
  readonly type?: NodeKind;
  readonly nodeId: string;
  /**
   * Port configuration. The port is identified by `id` (its name), e.g.
   * "Input" / "Output" / "@node/error". Both `portConf` and the legacy
   * `portConfig` spelling appear across fixtures; readers must accept either.
   */
  readonly portConf?: { readonly id: string; readonly type?: string };
  readonly portConfig?: Readonly<Record<string, unknown>>;
}

/**
 * A single connection. Direction is inverted from intuition and MUST be
 * preserved: `Output` is the upstream source (an O port), `Input` is the
 * downstream target (an I port). Wiring is `Output.O(id).connect(Input.I(id))`.
 */
export interface IConnection {
  readonly Input: IConnectionEndpoint;
  readonly Output: IConnectionEndpoint;
  /**
   * How many messages the connection holds, counting the ones its input is
   * still working on; a sender to a full connection waits (RFC 0001). A
   * positive integer. Absent: unbounded.
   */
  readonly capacity?: number;
  /** What a full bounded connection does with a new message: `'drop-oldest'` drops its oldest waiting one. */
  readonly overflow?: ConnectionOverflow;
}

/** The overflow strategies a bounded connection can have (RFC 0001). */
export type ConnectionOverflow = 'drop-oldest';

/** Port metadata carried on a node (the design-time port descriptors). */
export interface IPortInfo {
  readonly Input?: readonly Readonly<Record<string, unknown>>[];
  readonly Output?: readonly Readonly<Record<string, unknown>>[];
}

/** A node entry in the graph's node list. */
export interface INodeInfo {
  /** Node type key. A backend resolves it to a runtime node class. */
  readonly code: string;
  readonly name: string;
  readonly type: NodeKind;
  /** Stable per-instance id used to correlate nodes and connections. */
  readonly nodeId: string;
  readonly bizData?: IBizData;
  readonly portInfo?: IPortInfo;
  readonly position?: { readonly x: number; readonly y: number };
  readonly groupCode?: string;
  /** npm coordinate of the runtime implementation, e.g. "pkg@1.2.3". */
  readonly runtimeResource?: string;
  readonly [key: string]: unknown;
}

/** A dependency descriptor (populated by the compiler; optional for interpret). */
export interface IPackageInfo {
  readonly name: string;
  readonly version?: string;
  readonly local?: boolean;
}

/** The complete serialized graph. */
export interface IGraph {
  readonly deps?: readonly IPackageInfo[];
  readonly connections: readonly IConnection[];
  readonly nodeList: readonly INodeInfo[];
}
