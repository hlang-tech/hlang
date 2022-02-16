import Port from '../base/port';

export interface IPortDesc {
  src: Port;
  dst: Port[];
}

export const ERROR_PORT_NAME = '@node/error';
export const NODE_ID_PREFIX = '@hlang/node';
export const PORT_ID_PREFIX = '@hlang/port';

export const NODE_TYPE = {
  READABLE: Symbol.for('@type/readable'),
  WRITABLE: Symbol.for('@type/writable'),
  TRANSFORM: Symbol.for('@type/transform'),
};

export const IDENTITY = {
  NODE: Symbol.for('@identity/node'),
  PORT: Symbol.for('@identity/port'),
};

export enum STREAM_TYPE {
  I = 'I',
  O = 'O',
}

export const NOOP = () => void 0;
