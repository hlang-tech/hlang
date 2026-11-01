import type Port from '../base/port';

/** A connection between two ports: an output (`src`) feeding an input (`dst`). */
export interface IPortDesc {
  readonly src: Port;
  readonly dst: Port;
}

/** The name of the output port on which Readable and Transform nodes report errors. */
export const ERROR_PORT_NAME = '@node/error';
export const NODE_ID_PREFIX = '@hlang/node';
export const PORT_ID_PREFIX = '@hlang/port';

const READABLE: unique symbol = Symbol.for('@type/readable');
const WRITABLE: unique symbol = Symbol.for('@type/writable');
const TRANSFORM: unique symbol = Symbol.for('@type/transform');

/**
 * The three node kinds. They are registered symbols (`Symbol.for`), so nodes
 * from two copies of the runtime (its CommonJS and ES module builds) still
 * compare equal.
 */
export const NODE_TYPE = { READABLE, WRITABLE, TRANSFORM } as const;

/** One of the three node kinds. */
export type NodeKind = typeof READABLE | typeof WRITABLE | typeof TRANSFORM;

export const IDENTITY: { readonly NODE: symbol; readonly PORT: symbol } = {
  NODE: Symbol.for('@identity/node'),
  PORT: Symbol.for('@identity/port'),
};

/** A port's direction: `I` receives, `O` sends. */
export enum STREAM_TYPE {
  I = 'I',
  O = 'O',
}

export const NOOP = (): void => undefined;
