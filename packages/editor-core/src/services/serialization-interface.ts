/**
 * Serialization service interface: the codec between the editor model and
 * hlang's `IGraph` IR (consumed by the interpreter and the compiler alike).
 *
 * Direction is the load-bearing invariant: an `EditorEdge { source, target }`
 * serializes to `{ Output: source, Input: target }`, because in `IGraph`
 * `Output` is the upstream source (O port) and `Input` the downstream target
 * (I port). Getting this backwards is the single most error-prone mistake.
 */

import type { IGraph } from '@hlang-org/interpreter';
import { createDecorator } from '../di';
import type { GraphSnapshot } from '../model/types';
import type { IGraphModel } from './interfaces';

export interface ISerializationService {
  /** Export the model to hlang's `IGraph` (for interpret/compile). */
  toIGraph(model: IGraphModel): IGraph;
  /** Import an `IGraph` into a graph snapshot (to load into the model). */
  fromIGraph(graph: IGraph): GraphSnapshot;
}
export const ISerializationService =
  createDecorator<ISerializationService>('serializationService');
