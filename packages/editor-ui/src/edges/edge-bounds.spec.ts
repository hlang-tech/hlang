import { describe, expect, it } from 'vitest';
import { DEFAULT_EDGE_CAPACITY, boundsFields, capacityLabel, nextBounds } from './edge-bounds';

describe('boundsFields', () => {
  it('shows an unbounded connection with its capacity and overflow disabled', () => {
    expect(boundsFields({})).toEqual([
      { key: 'bounded', label: 'Bounded', type: 'toggle', value: false },
      { key: 'capacity', label: 'Capacity', type: 'number', value: DEFAULT_EDGE_CAPACITY, disabled: true },
      { key: 'dropOldest', label: 'Drop oldest when full', type: 'toggle', value: false, disabled: true },
    ]);
  });

  it('shows a bounded one as it is', () => {
    expect(boundsFields({ capacity: 4, overflow: 'drop-oldest' })).toEqual([
      { key: 'bounded', label: 'Bounded', type: 'toggle', value: true },
      { key: 'capacity', label: 'Capacity', type: 'number', value: 4, disabled: false },
      { key: 'dropOldest', label: 'Drop oldest when full', type: 'toggle', value: true, disabled: false },
    ]);
  });
});

describe('nextBounds', () => {
  it('bounds a connection at the default capacity, and unbounds it entirely', () => {
    expect(nextBounds({}, 'bounded', true)).toEqual({ capacity: DEFAULT_EDGE_CAPACITY });
    expect(nextBounds({ capacity: 4, overflow: 'drop-oldest' }, 'bounded', false)).toEqual({});
  });

  it('sets the capacity, held to a positive integer, keeping the overflow', () => {
    expect(nextBounds({ capacity: 4, overflow: 'drop-oldest' }, 'capacity', 8)).toEqual({ capacity: 8, overflow: 'drop-oldest' });
    expect(nextBounds({ capacity: 4 }, 'capacity', 0)).toEqual({ capacity: 1 });
    expect(nextBounds({ capacity: 4 }, 'capacity', 2.6)).toEqual({ capacity: 3 });
    expect(nextBounds({ capacity: 4 }, 'capacity', Number.NaN)).toEqual({ capacity: 4 });
  });

  it('switches drop-oldest on and off', () => {
    expect(nextBounds({ capacity: 4 }, 'dropOldest', true)).toEqual({ capacity: 4, overflow: 'drop-oldest' });
    expect(nextBounds({ capacity: 4, overflow: 'drop-oldest' }, 'dropOldest', false)).toEqual({ capacity: 4 });
  });

  it('changes nothing for an unbounded connection or an unknown field', () => {
    expect(nextBounds({}, 'capacity', 5)).toEqual({});
    expect(nextBounds({}, 'dropOldest', true)).toEqual({});
    expect(nextBounds({ capacity: 4 }, 'other', true)).toEqual({ capacity: 4 });
  });
});

describe('capacityLabel', () => {
  it('writes a capacity the way FBP notation does, and says when it drops', () => {
    expect(capacityLabel({})).toBeUndefined();
    expect(capacityLabel({ capacity: 4 })).toBe('[4]');
    expect(capacityLabel({ capacity: 4, overflow: 'drop-oldest' })).toBe('[4] drop oldest');
  });
});
