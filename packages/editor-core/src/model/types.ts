/**
 * Core domain model for the headless editor. Zero `any`.
 *
 * These types are the design-time twin of hlang's runtime concepts and its
 * `IGraph` serialization. They are deliberately framework-neutral: no React,
 * no RxJS, no DOM. Everything the editor manipulates is plain, strictly-typed
 * data derived from — and serializable back to — hlang semantics.
 */

/** Stable identifiers. Branded only nominally via naming, kept as strings. */
export type NodeId = string;
export type EdgeId = string;
/** A port's name, e.g. "Input" | "Output" | "@node/error". */
export type PortId = string;

/** The three hlang node kinds, matching `IGraph`'s `type` field. */
export type NodeKind = 'R' | 'T' | 'W';

/** Stream direction of a port, matching the runtime's `STREAM_TYPE`. */
export type PortDirection = 'I' | 'O';

/** Canonical name of the error port dug on every R and T node. */
export const ERROR_PORT_NAME = '@node/error';

/** A point on the canvas. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Serializable parameter values (mirrors the IGraph param shape). */
export type ParamValue =
  | string
  | number
  | boolean
  | null
  | readonly ParamValue[]
  | IParamObject;
export interface IParamObject {
  readonly [key: string]: ParamValue;
}
/** A bag of node parameters (the user-facing config under `bizData.params`). */
export type ParamBag = Readonly<Record<string, ParamValue>>;

/**
 * The design-time data type carried by a port, derived from `portInfo[].dto`.
 * Used for connection compatibility checks. Opaque original data is `unknown`.
 */
export interface DataType {
  /** Type name, e.g. "DTO_Input" | "string". */
  readonly name: string;
  /** Broad category of the type. */
  readonly kind: 'intrinsic' | 'interface' | 'reference' | 'unknown';
  /** The original, opaque dto payload — preserved but never dereferenced. */
  readonly raw?: unknown;
}

/** A single port on a node. */
export interface PortDescriptor {
  /** Port name, used as the connection port id. */
  readonly id: PortId;
  /** Stream direction: input (I) or output (O). */
  readonly direction: PortDirection;
  /** Human-readable display name. */
  readonly name: string;
  /** Design-time data type for compatibility checks. */
  readonly dataType: DataType;
  /** Whether this is the `@node/error` port. */
  readonly isError: boolean;
  /**
   * How the port's RxJS stream behaves, for visual distinction (nodes.io's
   * trigger-vs-param idea):
   *   - `'live'`  — a hot/continuous stream (default; hlang ports are streams).
   *   - `'value'` — emits only when its value changes.
   * Optional and additive; consumers default to `'live'` when absent.
   */
  readonly stream?: 'live' | 'value';
}

/** Find a port by id within a port list. Shared to avoid duplicate helpers. */
export function findPort(
  ports: readonly PortDescriptor[],
  id: string,
): PortDescriptor | undefined {
  return ports.find(port => port.id === id);
}

/**
 * A design-time node descriptor: the palette/registry entry for a `code`.
 * The runtime-side twin (a constructor) lives in `@hlang-org/interpreter`.
 */
export interface NodeDescriptor {
  /** Registry key; resolved (after camelization) to a runtime node class. */
  readonly code: string;
  /** Node kind. */
  readonly kind: NodeKind;
  /** Human-readable display name for the palette. */
  readonly displayName: string;
  /** Grouping code for palette organization (maps to `groupCode`). */
  readonly group: string;
  /** All ports, including `@node/error` for R and T. */
  readonly ports: readonly PortDescriptor[];
  /** Default parameter values applied when creating a node. */
  readonly defaultParams: ParamBag;
  /** npm coordinate of the runtime implementation. */
  readonly runtimeResource: string;
  /** Optional custom-editor resources for this node type. */
  readonly editorResource?: {
    readonly styleHref: string;
    readonly scriptHref: string;
  };
}

/** A node instance placed on the canvas. */
export interface EditorNode {
  readonly id: NodeId;
  readonly code: string;
  readonly kind: NodeKind;
  readonly name: string;
  readonly position: Point;
  readonly params: ParamBag;
  readonly ports: readonly PortDescriptor[];
  /** Lossless pass-through of unmodeled IGraph fields for round-tripping. */
  readonly raw?: Readonly<Record<string, unknown>>;
}

/** One endpoint of an edge: a specific port on a specific node. */
export interface Endpoint {
  readonly nodeId: NodeId;
  readonly portId: PortId;
}

/**
 * A directed edge. `source` MUST be an O port and `target` an I port — this
 * maps to IGraph's `{ Output: source, Input: target }` and the runtime's
 * `source.O(id).connect(target.I(id))`.
 */
export interface EditorEdge {
  readonly id: EdgeId;
  readonly source: Endpoint;
  readonly target: Endpoint;
}

/** An immutable snapshot of the whole graph, for history and import/reset. */
export interface GraphSnapshot {
  readonly nodes: readonly EditorNode[];
  readonly edges: readonly EditorEdge[];
}
