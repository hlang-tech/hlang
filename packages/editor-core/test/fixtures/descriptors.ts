/**
 * Design-time node descriptor fixtures for editor-core tests.
 *
 * These mirror the R/T/W port topology exactly as hlang defines it:
 *   - R: an "Output" O port + the "@node/error" O port. No I ports.
 *   - T: an "Input" I port, an "Output" O port, + "@node/error" O port.
 *   - W: an "Input" I port only. NO error port.
 */

import { ERROR_PORT_NAME } from '../../src/model/types';
import type {
  DataType,
  NodeDescriptor,
  PortDescriptor,
} from '../../src/model/types';

const anyData: DataType = { name: 'DTO', kind: 'interface' };

function inPort(id = 'Input'): PortDescriptor {
  return { id, direction: 'I', name: id, dataType: anyData, isError: false };
}
function outPort(id = 'Output'): PortDescriptor {
  return { id, direction: 'O', name: id, dataType: anyData, isError: false };
}
function errorPort(): PortDescriptor {
  return {
    id: ERROR_PORT_NAME,
    direction: 'O',
    name: 'error',
    dataType: anyData,
    isError: true,
  };
}

export const readableDescriptor: NodeDescriptor = {
  code: 'test-source',
  kind: 'R',
  displayName: 'Source',
  group: 'input',
  ports: [outPort(), errorPort()],
  defaultParams: {},
  runtimeResource: '@test/source@1.0.0',
};

export const transformDescriptor: NodeDescriptor = {
  code: 'test-transform',
  kind: 'T',
  displayName: 'Transform',
  group: 'process',
  ports: [inPort(), outPort(), errorPort()],
  defaultParams: {},
  runtimeResource: '@test/transform@1.0.0',
};

export const writableDescriptor: NodeDescriptor = {
  code: 'test-sink',
  kind: 'W',
  displayName: 'Sink',
  group: 'output',
  ports: [inPort()],
  defaultParams: {},
  runtimeResource: '@test/sink@1.0.0',
};
