/**
 * `previewValue` — a short, single-line text for any value a node sends, for
 * the run log and the inspector. Messages are `unknown`: they can be huge,
 * cyclic, class instances, or objects whose getters throw, so the preview
 * never throws, never prints a function's source, and is cut to a limit.
 */

/** The longest preview, in characters, unless a caller asks for another. */
export const PREVIEW_LENGTH = 120;

const CIRCULAR = '[Circular]';

/** A function by its name only: its source is never printed. */
function functionPreview(value: { readonly name: string }): string {
  return `ƒ ${value.name === '' ? 'anonymous' : value.name}`;
}

function bigintPreview(value: bigint): string {
  return `${value.toString()}n`;
}

/** The name of a value's class, or `Object` for a plain or prototype-less object. */
function className(value: object): string {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype === null || prototype === Object.prototype) {
    return 'Object';
  }
  const name: unknown = typeof prototype === 'object' && 'constructor' in prototype ? prototype.constructor : undefined;
  return typeof name === 'function' && name.name !== '' ? name.name : 'Object';
}

/** What a nested value becomes inside the JSON of an object or array. */
function nestedPreview(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return bigintPreview(value);
  }
  if (typeof value === 'function') {
    return functionPreview(value);
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  if (value instanceof Map || value instanceof Set) {
    return `${value instanceof Map ? 'Map' : 'Set'}(${String(value.size)})`;
  }
  return value;
}

/** Compact JSON of an object or array, with cycles, bigints and functions made printable. */
function json(value: object): string | undefined {
  // The objects from the root to the one being serialized: a value already
  // among them is a cycle. (A value seen elsewhere is merely shared.)
  const ancestors: unknown[] = [];
  return JSON.stringify(value, function replace(this: unknown, _key: string, nested: unknown): unknown {
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop();
    }
    if (typeof nested === 'object' && nested !== null) {
      if (ancestors.includes(nested)) {
        return CIRCULAR;
      }
      ancestors.push(nested);
    }
    return nestedPreview(nested);
  });
}

function fullPreview(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'bigint':
    case 'function':
    case 'symbol': {
      const preview = nestedPreview(value);
      return typeof preview === 'string' ? preview : String(preview);
    }
    case 'object':
      break;
    default:
      return String(value);
  }
  if (value === null) {
    return 'null';
  }
  if (value instanceof Error || value instanceof Map || value instanceof Set) {
    return String(nestedPreview(value));
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
  }
  const name = Array.isArray(value) ? 'Array' : className(value);
  let body: string | undefined;
  try {
    body = json(value);
  } catch {
    // A getter that throws, or a toJSON that does: name the value instead.
    return name;
  }
  if (body === undefined) {
    return name;
  }
  return name === 'Object' || name === 'Array' ? body : `${name} ${body}`;
}

/** A single-line preview of `value`, at most `maxLength` characters. */
export function previewValue(value: unknown, maxLength: number = PREVIEW_LENGTH): string {
  const preview = fullPreview(value);
  return preview.length <= maxLength ? preview : `${preview.slice(0, maxLength - 1)}…`;
}
