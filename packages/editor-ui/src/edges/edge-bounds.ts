/**
 * A connection's bounds (RFC 0001) as the editor shows and edits them: the
 * fields of the inspector's Connection section, the bounds a change to one of
 * them makes, and the label a bounded edge carries.
 */

import type { EdgeBounds, ParamValue } from '@hlang-org/editor-core';
import type { ParamField } from '../schema/param-field';

/** The capacity a connection gets when it is first bounded: JavaFBP's production default. */
export const DEFAULT_EDGE_CAPACITY = 10;

/** The inspector's fields for a connection with `bounds`. */
export function boundsFields(bounds: EdgeBounds): ParamField[] {
  const bounded = bounds.capacity !== undefined;
  return [
    { key: 'bounded', label: 'Bounded', type: 'toggle', value: bounded },
    { key: 'capacity', label: 'Capacity', type: 'number', value: bounds.capacity ?? DEFAULT_EDGE_CAPACITY, disabled: !bounded },
    {
      key: 'dropOldest',
      label: 'Drop oldest when full',
      type: 'toggle',
      value: bounds.overflow === 'drop-oldest',
      disabled: !bounded,
    },
  ];
}

/** The bounds after the inspector's field `key` is set to `value`. */
export function nextBounds(bounds: EdgeBounds, key: string, value: ParamValue): EdgeBounds {
  const { capacity, overflow } = bounds;
  if (key === 'bounded') {
    return value === true ? { capacity: capacity ?? DEFAULT_EDGE_CAPACITY } : {};
  }
  if (capacity === undefined) {
    return {};
  }
  const keep = overflow === undefined ? {} : { overflow };
  if (key === 'capacity') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return bounds;
    }
    return { capacity: Math.max(1, Math.round(value)), ...keep };
  }
  if (key === 'dropOldest') {
    return value === true ? { capacity, overflow: 'drop-oldest' } : { capacity };
  }
  return bounds;
}

/** A bounded edge's label, in FBP notation: `[4]`; `undefined` when unbounded. */
export function capacityLabel(bounds: EdgeBounds): string | undefined {
  if (bounds.capacity === undefined) {
    return undefined;
  }
  const label = `[${String(bounds.capacity)}]`;
  return bounds.overflow === 'drop-oldest' ? `${label} drop oldest` : label;
}
