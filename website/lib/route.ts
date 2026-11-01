/**
 * Orthogonal routes with rounded corners: the way the trace in the hlang mark
 * runs. A route is a list of points joined by horizontal and vertical runs.
 */

import { svgPath } from '@/lib/svg-path';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * A point on a route. A junction is a corner where another route branches
 * off: it stays square, so the branch leaves exactly at the junction's dot.
 */
export interface RoutePoint extends Point {
  readonly junction?: true;
}

/** Drops points that repeat or sit on a straight run, so every kept point is a real corner. */
function corners(points: readonly RoutePoint[]): RoutePoint[] {
  const kept: RoutePoint[] = [];
  for (const point of points) {
    const last = kept[kept.length - 1];
    if (last !== undefined && Math.abs(last.x - point.x) < 0.5 && Math.abs(last.y - point.y) < 0.5) {
      continue;
    }
    const before = kept[kept.length - 2];
    if (before !== undefined && last !== undefined) {
      const straight =
        (Math.abs(before.x - last.x) < 0.5 && Math.abs(last.x - point.x) < 0.5) ||
        (Math.abs(before.y - last.y) < 0.5 && Math.abs(last.y - point.y) < 0.5);
      if (straight) {
        // A junction on a straight run is a pass-through, not a corner.
        kept[kept.length - 1] = point;
        continue;
      }
    }
    kept.push(point);
  }
  return kept;
}

/**
 * The SVG path of an orthogonal route, each corner rounded with `radius` (less
 * on short runs) except junctions, which stay square.
 */
export function orthogonalPath(points: readonly RoutePoint[], radius = 10): string {
  const route = corners(points);
  const first = route[0];
  if (first === undefined) {
    return '';
  }
  const parts: (string | number)[] = ['M', first.x, first.y];
  for (let index = 1; index < route.length; index += 1) {
    const point = route[index];
    const previous = route[index - 1];
    const next = route[index + 1];
    if (point === undefined || previous === undefined) {
      continue;
    }
    if (next === undefined || point.junction === true) {
      parts.push('L', point.x, point.y);
      continue;
    }
    const inLength = Math.hypot(point.x - previous.x, point.y - previous.y);
    const outLength = Math.hypot(next.x - point.x, next.y - point.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const enter = { x: point.x - ((point.x - previous.x) / inLength) * r, y: point.y - ((point.y - previous.y) / inLength) * r };
    const leave = { x: point.x + ((next.x - point.x) / outLength) * r, y: point.y + ((next.y - point.y) / outLength) * r };
    parts.push('L', enter.x, enter.y, 'Q', point.x, point.y, leave.x, leave.y);
  }
  return svgPath(...parts);
}
