/**
 * The route of an edge from a node back into the same node: a Transform fed
 * by its own output (iteration). A curve between two handles on opposite
 * sides of one node would cut across it; instead the edge leaves the output
 * to the right, runs under the node and comes up on the left into the input,
 * with rounded corners, as node editors route an edge that goes backwards
 * (n8n's back edges). Pure geometry, so the edge component only draws it.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SelfLoopInput {
  /** The output handle (on the node's right side) and the input handle (on its left). */
  readonly source: Point;
  readonly target: Point;
  /** The node, in the same coordinates. */
  readonly node: Rect;
  /** How far the route keeps from the node. Default `SELF_LOOP_CLEARANCE`. */
  readonly clearance?: number;
  /** The corner radius, reduced where a segment is too short. Default `SELF_LOOP_RADIUS`. */
  readonly radius?: number;
}

export interface SelfLoop {
  /** SVG path data. */
  readonly path: string;
  /** Where a label sits: the middle of the run under the node. */
  readonly labelX: number;
  readonly labelY: number;
}

/** The design system's distance between a self-loop and its node, in flow units. */
export const SELF_LOOP_CLEARANCE = 24;
/** The design system's corner radius for a self-loop, in flow units. */
export const SELF_LOOP_RADIUS = 10;

function format(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function distance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** A point `length` from `from` towards `to` (the segments are horizontal or vertical). */
function toward(from: Point, to: Point, length: number): Point {
  const span = distance(from, to);
  const share = span === 0 ? 0 : length / span;
  return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
}

export function selfLoopPath(input: SelfLoopInput): SelfLoop {
  const clearance = input.clearance ?? SELF_LOOP_CLEARANCE;
  const radius = input.radius ?? SELF_LOOP_RADIUS;
  const { source, target, node } = input;
  const right = Math.max(source.x, node.x + node.width) + clearance;
  const left = Math.min(target.x, node.x) - clearance;
  const below = node.y + node.height + clearance;

  // Start, the four corners of the route, end.
  const points: readonly Point[] = [
    source,
    { x: right, y: source.y },
    { x: right, y: below },
    { x: left, y: below },
    { x: left, y: target.y },
    target,
  ];
  const parts = [`M ${format(source.x)} ${format(source.y)}`];
  for (let i = 1; i < points.length - 1; i += 1) {
    const before = points[i - 1] ?? source;
    const corner = points[i] ?? source;
    const after = points[i + 1] ?? target;
    const r = Math.min(radius, distance(before, corner) / 2, distance(corner, after) / 2);
    if (r <= 0) {
      parts.push(`L ${format(corner.x)} ${format(corner.y)}`);
      continue;
    }
    const enter = toward(corner, before, r);
    const leave = toward(corner, after, r);
    parts.push(
      `L ${format(enter.x)} ${format(enter.y)} Q ${format(corner.x)} ${format(corner.y)} ${format(leave.x)} ${format(leave.y)}`,
    );
  }
  parts.push(`L ${format(target.x)} ${format(target.y)}`);
  return { path: parts.join(' '), labelX: (right + left) / 2, labelY: below };
}
