/**
 * `planInsertOnEdge` — the pure, smart judgement behind "drop a node onto an
 * edge to splice it in". An edge A.O → B.I can be split into A → N → B ONLY when
 * the dropped node N can legally sit in the middle:
 *   - some input port of N can accept A's upstream output  (canLink(A.O, N.I))
 *   - some output port of N can feed B's downstream input   (canLink(N.O, B.I))
 * Both are checked with `IConnectionValidator.canLink` (direction + type), so
 * this reuses the exact wiring rules — and naturally rejects R (no input) and W
 * (no output), and any type-incompatible node. Returns the two fresh edges, or
 * null when no legal splice exists. No side effects.
 */

import type { EditorEdge, EditorNode, Point } from '../model/types';
import { findPort } from '../model/types';
import type { IConnectionValidator, IGraphModel } from './interfaces';
import type { IIdGenerator } from './id-generator';

/**
 * Shortest distance from `p` to the line SEGMENT a–b (not the infinite line):
 * the projection is clamped to the segment, so points beyond an endpoint measure
 * to that endpoint. Used to hit-test "is a dropped node on this edge?" — a
 * segment, not a midpoint, so long edges are matched along their whole length.
 * A degenerate (zero-length) segment reduces to the distance to the point.
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const projX = a.x + clamped * dx;
  const projY = a.y + clamped * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export interface InsertPlan {
  /** A.O → N.<firstCompatibleInput> */
  readonly sourceEdge: EditorEdge;
  /** N.<firstCompatibleOutput> → B.I */
  readonly targetEdge: EditorEdge;
}

export function planInsertOnEdge(
  node: EditorNode,
  edge: EditorEdge,
  model: IGraphModel,
  validator: IConnectionValidator,
  idGenerator: IIdGenerator,
): InsertPlan | null {
  const upstream = model.getNode(edge.source.nodeId);
  const downstream = model.getNode(edge.target.nodeId);
  if (upstream === undefined || downstream === undefined) {
    return null;
  }
  const upstreamPort = findPort(upstream.ports, edge.source.portId); // an O port
  const downstreamPort = findPort(downstream.ports, edge.target.portId); // an I port
  if (upstreamPort === undefined || downstreamPort === undefined) {
    return null;
  }

  // First input on N that can accept the upstream output (never the error port).
  const inPort = node.ports.find(
    p => p.direction === 'I' && !p.isError && validator.canLink(upstreamPort, p).ok,
  );
  // First non-error output on N that can feed the downstream input.
  const outPort = node.ports.find(
    p => p.direction === 'O' && !p.isError && validator.canLink(p, downstreamPort).ok,
  );
  if (inPort === undefined || outPort === undefined) {
    return null;
  }

  return {
    sourceEdge: {
      id: idGenerator.nextEdgeId(),
      source: edge.source,
      target: { nodeId: node.id, portId: inPort.id },
    },
    targetEdge: {
      id: idGenerator.nextEdgeId(),
      source: { nodeId: node.id, portId: outPort.id },
      target: edge.target,
    },
  };
}
