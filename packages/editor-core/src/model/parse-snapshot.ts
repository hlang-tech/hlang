/**
 * Reads a graph snapshot from untrusted data, such as the system clipboard or
 * a file: every field is checked, so what is returned is a valid
 * `GraphSnapshot` and anything else is rejected as a whole.
 */

import type {
  EdgeBounds,
  DataType,
  EditorEdge,
  EditorNode,
  Endpoint,
  GraphSnapshot,
  NodeKind,
  ParamBag,
  ParamValue,
  Point,
  PortDescriptor,
  PortDirection,
} from './types';

type Fields = Readonly<Record<string, unknown>>;

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNodeKind(value: unknown): value is NodeKind {
  return value === 'R' || value === 'T' || value === 'W';
}

function isDirection(value: unknown): value is PortDirection {
  return value === 'I' || value === 'O';
}

function isDataTypeKind(value: unknown): value is DataType['kind'] {
  return value === 'intrinsic' || value === 'interface' || value === 'reference' || value === 'unknown';
}

function isParamValue(value: unknown): value is ParamValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isParamValue);
  }
  return isFields(value) && Object.values(value).every(isParamValue);
}

function parsePoint(value: unknown): Point | null {
  return isFields(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y) ? { x: value.x, y: value.y } : null;
}

function parseParams(value: unknown): ParamBag | null {
  if (!isFields(value)) {
    return null;
  }
  const params: Record<string, ParamValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isParamValue(entry)) {
      return null;
    }
    params[key] = entry;
  }
  return params;
}

function parseDataType(value: unknown): DataType | null {
  if (!isFields(value) || !isString(value.name) || !isDataTypeKind(value.kind)) {
    return null;
  }
  return 'raw' in value ? { name: value.name, kind: value.kind, raw: value.raw } : { name: value.name, kind: value.kind };
}

function parsePort(value: unknown): PortDescriptor | null {
  if (!isFields(value) || !isString(value.id) || !isDirection(value.direction) || !isString(value.name)) {
    return null;
  }
  const dataType = parseDataType(value.dataType);
  if (dataType === null || typeof value.isError !== 'boolean') {
    return null;
  }
  const port = { id: value.id, direction: value.direction, name: value.name, dataType, isError: value.isError };
  if (value.stream === undefined) {
    return port;
  }
  return value.stream === 'live' || value.stream === 'value' ? { ...port, stream: value.stream } : null;
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const items: T[] = [];
  for (const item of value) {
    const parsed = parse(item);
    if (parsed === null) {
      return null;
    }
    items.push(parsed);
  }
  return items;
}

function parseNode(value: unknown): EditorNode | null {
  if (!isFields(value) || !isString(value.id) || !isString(value.code) || !isNodeKind(value.kind) || !isString(value.name)) {
    return null;
  }
  const position = parsePoint(value.position);
  const params = parseParams(value.params);
  const ports = parseList(value.ports, parsePort);
  if (position === null || params === null || ports === null) {
    return null;
  }
  const node = { id: value.id, code: value.code, kind: value.kind, name: value.name, position, params, ports };
  if (value.raw === undefined) {
    return node;
  }
  return isFields(value.raw) ? { ...node, raw: value.raw } : null;
}

function parseEndpoint(value: unknown): Endpoint | null {
  return isFields(value) && isString(value.nodeId) && isString(value.portId)
    ? { nodeId: value.nodeId, portId: value.portId }
    : null;
}

/** An edge's bounds (RFC 0001), or `null` if they are not ones a graph accepts. */
function parseBounds(value: Readonly<Record<string, unknown>>): EdgeBounds | null {
  const { capacity, overflow } = value;
  if (capacity === undefined) {
    return overflow === undefined ? {} : null;
  }
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1) {
    return null;
  }
  if (overflow === undefined) {
    return { capacity };
  }
  return overflow === 'drop-oldest' ? { capacity, overflow } : null;
}

function parseEdge(value: unknown): EditorEdge | null {
  if (!isFields(value) || !isString(value.id)) {
    return null;
  }
  const source = parseEndpoint(value.source);
  const target = parseEndpoint(value.target);
  const bounds = parseBounds(value);
  return source === null || target === null || bounds === null ? null : { id: value.id, source, target, ...bounds };
}

/** The snapshot in `value`, or `null` if any part of it is not a valid snapshot. */
export function parseGraphSnapshot(value: unknown): GraphSnapshot | null {
  if (!isFields(value)) {
    return null;
  }
  const nodes = parseList(value.nodes, parseNode);
  const edges = parseList(value.edges, parseEdge);
  return nodes === null || edges === null ? null : { nodes, edges };
}
