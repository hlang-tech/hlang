/**
 * Pure model behind the node-search palette. No React, no DOM.
 *
 * Two responsibilities:
 *   1. Turn the design-time registry into fuzzy-searchable candidates and rank
 *      them against a query (`descriptorCandidates` + `searchNodes`).
 *   2. When the palette is opened by releasing a dangling connection into empty
 *      space, offer ONLY nodes that can legally complete that connection, and
 *      remember which port on each closes it (`connectableCandidates`). The
 *      legality decision is delegated to the core `IConnectionValidator` — this
 *      module never re-encodes hlang's connection rules.
 */

import type {
  NodeDescriptor,
  PortDescriptor,
  Endpoint,
  IConnectionValidator,
} from '@hlang-org/editor-core';
import { fuzzyRank } from './fuzzy';
import type { FuzzyCandidate, FuzzyResult } from './fuzzy';

/** A registry descriptor made searchable, keyed by its display name. */
export type NodeCandidate = FuzzyCandidate<NodeDescriptor>;

/** A ranked search result carrying the matched descriptor. */
export type NodeSearchResult = FuzzyResult<NodeDescriptor>;

/** Build fuzzy candidates from registry descriptors (display-name keyed). */
export function descriptorCandidates(
  descriptors: readonly NodeDescriptor[],
): readonly NodeCandidate[] {
  return descriptors.map(descriptor => ({ text: descriptor.displayName, value: descriptor }));
}

/** Rank descriptors against `query`, best first (empty query keeps order). */
export function searchNodes(
  query: string,
  descriptors: readonly NodeDescriptor[],
): readonly NodeSearchResult[] {
  return fuzzyRank(query, descriptorCandidates(descriptors));
}

/**
 * A connection left dangling in empty space. `fromEndpoint` is the port the
 * user dragged from and `fromPort` its resolved descriptor; `direction` says
 * whether that endpoint is the connection's source (an output, needing a
 * target) or its target (an input, needing a source). The palette will create a
 * node and wire the missing side.
 */
export interface PendingConnection {
  readonly fromEndpoint: Endpoint;
  /** Descriptor of the port the drag started from (resolved from the model). */
  readonly fromPort: PortDescriptor;
  readonly direction: 'from-source' | 'from-target';
}

/**
 * A search result augmented with the specific port on the candidate node that
 * would complete a pending connection.
 */
export interface ConnectableResult {
  readonly candidate: NodeSearchResult;
  /** The port id on the (future) new node that closes the connection. */
  readonly connectPortId: string;
}

/**
 * Filter and rank descriptors to those that can legally complete `pending`,
 * annotating each with the completing port. Legality is decided by the core
 * validator's model-free `canLink` (direction + DTO): for a dangling source we
 * ask canLink(danglingSource, candidatePort); for a dangling target we ask
 * canLink(candidatePort, danglingTarget). No graph model is consulted, because
 * the candidate node does not exist yet — legality here is purely a property of
 * the two ports.
 */
export function connectableCandidates(
  query: string,
  descriptors: readonly NodeDescriptor[],
  pending: PendingConnection,
  validator: Pick<IConnectionValidator, 'canLink'>,
): readonly ConnectableResult[] {
  const ranked = searchNodes(query, descriptors);
  const out: ConnectableResult[] = [];

  for (const result of ranked) {
    const port = firstCompletingPort(result.value.ports, pending, validator);
    if (port !== undefined) {
      out.push({ candidate: result, connectPortId: port });
    }
  }
  return out;
}

/**
 * Find the first port on `ports` that legally completes `pending`, or
 * `undefined` if none do. For a dangling source (output) we look for an input
 * on the candidate; for a dangling target (input), an output.
 */
function firstCompletingPort(
  ports: readonly PortDescriptor[],
  pending: PendingConnection,
  validator: Pick<IConnectionValidator, 'canLink'>,
): string | undefined {
  for (const port of ports) {
    const ok =
      pending.direction === 'from-source'
        ? validator.canLink(pending.fromPort, port).ok
        : validator.canLink(port, pending.fromPort).ok;
    if (ok) {
      return port.id;
    }
  }
  return undefined;
}
