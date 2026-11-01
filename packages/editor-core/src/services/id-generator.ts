/**
 * `IdGenerator` — pluggable id strategy for nodes and edges.
 *
 * The default produces monotonically increasing, prefixed ids. It is injected
 * (not global) so that serialization/import can supply deterministic ids and
 * tests can assert exact values. The runtime uses `@hlang/node-<uuid>` and the
 * compiler fixtures use `spider-<uuid>`; either strategy can be plugged in.
 */

import { createDecorator } from '../di';

export interface IIdGenerator {
  nextNodeId(): string;
  nextEdgeId(): string;
  /**
   * Reserve ids already present in the graph so future ids never collide. Call
   * after importing a graph whose ids were minted elsewhere (e.g. serialization).
   * Ids that don't match this generator's `<prefix>-<n>` scheme are ignored.
   */
  reserve(ids: Iterable<string>): void;
}
export const IIdGenerator = createDecorator<IIdGenerator>('idGenerator');

export class CountingIdGenerator implements IIdGenerator {
  private nodeSeq = 0;
  private edgeSeq = 0;

  constructor(
    private readonly nodePrefix = 'node',
    private readonly edgePrefix = 'edge',
  ) {}

  nextNodeId(): string {
    this.nodeSeq += 1;
    return `${this.nodePrefix}-${String(this.nodeSeq)}`;
  }

  nextEdgeId(): string {
    this.edgeSeq += 1;
    return `${this.edgePrefix}-${String(this.edgeSeq)}`;
  }

  reserve(ids: Iterable<string>): void {
    for (const id of ids) {
      this.nodeSeq = Math.max(this.nodeSeq, parseSeq(id, this.nodePrefix));
      this.edgeSeq = Math.max(this.edgeSeq, parseSeq(id, this.edgePrefix));
    }
  }
}

/** Extract the numeric suffix of a `<prefix>-<n>` id, or 0 if it doesn't match. */
function parseSeq(id: string, prefix: string): number {
  const marker = `${prefix}-`;
  if (!id.startsWith(marker)) {
    return 0;
  }
  const n = Number(id.slice(marker.length));
  return Number.isInteger(n) && n > 0 ? n : 0;
}
