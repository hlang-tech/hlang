/**
 * Registry assembly: turn the node kit into the two registries the app needs —
 * the design-time `NodeDescriptor[]` (for palette + validation + serialization)
 * and the runtime `NodeRegistry` (for interpreted execution). Both are keyed by
 * the same `code`, guaranteed by `defineNode`.
 *
 * Sinks that report to the host are bound to callbacks here, the one place that
 * knows about the host; the kit itself stays host-agnostic.
 */

import { NodeRegistry as RuntimeNodeRegistry } from '@hlang-org/interpreter';
import type { FlowFactory } from '@hlang-org/interpreter';
import type { NodeDescriptor } from '@hlang-org/editor-core';
import { rt } from './runtime-boundary';
import {
  KIT_NODES,
  makeConsoleSink,
  consoleSinkDescriptor,
  makeCollectSink,
  collectSinkDescriptor,
} from './kit';

/** Callbacks the host provides for reporting sink output. */
export interface SinkReporters {
  readonly onConsole: (value: unknown) => void;
  readonly onCollect: (summary: string) => void;
}

/** All design-time descriptors (kit + host-bound sinks). */
export function nodeDescriptors(): readonly NodeDescriptor[] {
  return [...KIT_NODES.map(n => n.descriptor), consoleSinkDescriptor, collectSinkDescriptor];
}

/** Assemble the runtime registry + a flow factory for the interpreter. */
export function makeRuntime(reporters: SinkReporters): {
  registry: RuntimeNodeRegistry;
  createFlow: FlowFactory;
} {
  const registry = new RuntimeNodeRegistry();
  for (const node of KIT_NODES) {
    registry.register(node.descriptor.code, node.ctor);
  }
  registry.register('console-sink', makeConsoleSink(reporters.onConsole));
  registry.register('collect-sink', makeCollectSink(reporters.onCollect));
  return { registry, createFlow: options => new rt.Flow(options) };
}
