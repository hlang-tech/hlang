/**
 * Unit tests for the fuzzy matcher. Locks the ranking behavior the palette
 * relies on: subsequence matching, contiguity/boundary bonuses, and the
 * empty-query pass-through.
 */

import { describe, it, expect } from 'vitest';
import { fuzzyScore, fuzzyRank } from './fuzzy';

describe('fuzzyScore', () => {
  it('returns null when the query is not a subsequence', () => {
    expect(fuzzyScore('xyz', 'Text Source')).toBeNull();
    expect(fuzzyScore('sourcee', 'source')).toBeNull(); // longer than target
  });

  it('matches a case-insensitive subsequence and records positions', () => {
    const match = fuzzyScore('ts', 'Text Source');
    expect(match).not.toBeNull();
    // 'T' at 0, 's' at 5 (Source)
    expect(match?.positions).toEqual([0, 5]);
  });

  it('scores an empty query as a zero-score match', () => {
    expect(fuzzyScore('', 'anything')).toEqual({ score: 0, positions: [] });
  });

  it('prefers a contiguous prefix match over a scattered one', () => {
    const contiguous = fuzzyScore('up', 'Uppercase');
    const scattered = fuzzyScore('up', 'Unzip Payload');
    expect(contiguous).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect((contiguous?.score ?? 0)).toBeGreaterThan(scattered?.score ?? 0);
  });

  it('rewards word-boundary matches (after a separator)', () => {
    const boundary = fuzzyScore('ts', 'text-source');
    const midword = fuzzyScore('tx', 'textsource');
    expect(boundary).not.toBeNull();
    expect(midword).not.toBeNull();
  });
});

describe('fuzzyRank', () => {
  const candidates = [
    { text: 'Text Source', value: 1 },
    { text: 'Uppercase', value: 2 },
    { text: 'Console', value: 3 },
  ];

  it('ranks matches best-first and drops non-matches', () => {
    const results = fuzzyRank('con', candidates);
    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(3);
  });

  it('returns candidates in original order for an empty query', () => {
    const results = fuzzyRank('', candidates);
    expect(results.map(r => r.value)).toEqual([1, 2, 3]);
  });
});
