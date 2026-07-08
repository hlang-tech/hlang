/**
 * The `IGraph` intermediate representation — hlang's serialized graph format.
 *
 * This is hlang's IR: the "source text" of the visual language, today encoded
 * as JSON (DSL-able in the future). The shape is aligned with the community
 * compiler (`packages/compiler/src/complier/index.ts`) and the real fixture at
 * `packages/compiler/test/fixtures/graph.ts`, so a single `IGraph` can be
 * either interpreted in-process (this package) or compiled to a standalone
 * program (the compiler) without divergence.
 *
 * Strictly typed with zero `any`: opaque, node-defined data is `unknown`.
 */

import type { NodeKind } from './runtime-contract';

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
}

/** Port metadata carried on a node (the design-time port descriptors). */
export interface IPortInfo {
  readonly Input?: readonly Readonly<Record<string, unknown>>[];
  readonly Output?: readonly Readonly<Record<string, unknown>>[];
}

/** A node entry in the graph's node list. */
export interface INodeInfo {
  /** Registry key. Resolved (after camelization) to a runtime node class. */
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
