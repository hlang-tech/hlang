/**
 * The generic RxJS node kit — a "downloadable node pack" the playground
 * registers into the editor. Pure stream primitives (sources / transforms /
 * sinks), zero business concepts: the editor only ever sees R/T/W + IGraph.
 *
 * Sinks that need to report to the host (console, collect) expose a factory;
 * the pure descriptors are gathered here and the runtime ctors are bound at
 * assembly time (see ../registry.ts).
 */

import type { NodeDefinition } from '../define-node';
import { textSource } from './sources/text-source';
import { intervalSource } from './sources/interval-source';
import { rangeSource } from './sources/range-source';
import { constantSource } from './sources/constant-source';
import { imageSource } from './sources/image-source';
import { uppercase } from './transforms/uppercase';
import { mapScale } from './transforms/map-scale';
import { filterThreshold } from './transforms/filter-threshold';
import { scanSum } from './transforms/scan-sum';
import { delay } from './transforms/delay';
import { merge } from './transforms/merge';

/** Node definitions with a self-contained runtime ctor (no host binding). */
export const KIT_NODES: readonly NodeDefinition[] = [
  textSource,
  intervalSource,
  rangeSource,
  constantSource,
  imageSource,
  uppercase,
  mapScale,
  filterThreshold,
  scanSum,
  delay,
  merge,
];

export { makeConsoleSink, consoleSinkDescriptor } from './sinks/console-sink';
export { makeCollectSink, collectSinkDescriptor } from './sinks/collect-sink';
