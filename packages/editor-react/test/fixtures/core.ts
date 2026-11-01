/**
 * A ready-to-use EditorCore with R/T/W descriptors registered, for hook tests.
 */

import { createEditorCore } from '@hlang-org/editor-core';
import type { EditorCore, NodeDescriptor, PortDescriptor } from '@hlang-org/editor-core';

const dto = { name: 'DTO', kind: 'interface' as const };
const inPort = (id = 'Input'): PortDescriptor => ({ id, direction: 'I', name: id, dataType: dto, isError: false });
const outPort = (id = 'Output'): PortDescriptor => ({ id, direction: 'O', name: id, dataType: dto, isError: false });
const errPort = (): PortDescriptor => ({ id: '@node/error', direction: 'O', name: 'error', dataType: dto, isError: true });

export const R: NodeDescriptor = {
  code: 'r', kind: 'R', displayName: 'Source', group: 'input',
  ports: [outPort(), errPort()], defaultParams: {}, runtimeResource: '@t/r@1',
};
export const T: NodeDescriptor = {
  code: 't', kind: 'T', displayName: 'Transform', group: 'process',
  ports: [inPort(), outPort(), errPort()], defaultParams: {}, runtimeResource: '@t/t@1',
};
export const W: NodeDescriptor = {
  code: 'w', kind: 'W', displayName: 'Sink', group: 'output',
  ports: [inPort()], defaultParams: {}, runtimeResource: '@t/w@1',
};

export function makeCore(): EditorCore {
  const core = createEditorCore();
  core.registry.register(R);
  core.registry.register(T);
  core.registry.register(W);
  return core;
}
