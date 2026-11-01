/**
 * Small, dependency-free fuzzy matcher for the node search palette. Pure
 * functions — the only logic in editor-ui that carries its own unit tests
 * (behavior, not pixels). Ranks candidates by subsequence match quality:
 * contiguous and word-boundary matches score higher, earlier matches score
 * higher, shorter targets break ties.
 */

/** A scored match with the matched character positions (for highlighting). */
export interface FuzzyMatch {
  readonly score: number;
  readonly positions: readonly number[];
}

/**
 * Score `query` against `target` as a case-insensitive subsequence match.
 * Returns `null` when `target` does not contain `query` as a subsequence.
 * An empty query matches everything with score 0 (stable, no reordering).
 */
export function fuzzyScore(query: string, target: string): FuzzyMatch | null {
  if (query.length === 0) {
    return { score: 0, positions: [] };
  }
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  const positions: number[] = [];
  let score = 0;
  let qi = 0;
  let prevMatch = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti += 1) {
    if (t[ti] !== q[qi]) {
      continue;
    }
    positions.push(ti);

    // Base point for a matched character.
    let point = 1;
    // Contiguous with the previous matched char.
    if (ti === prevMatch + 1) {
      point += 3;
    }
    // At a word boundary (start, or after a separator / camelCase hump).
    if (ti === 0 || isBoundary(target, ti)) {
      point += 2;
    }
    // Earlier matches are slightly preferred.
    point += Math.max(0, 2 - ti * 0.05);

    score += point;
    prevMatch = ti;
    qi += 1;
  }

  if (qi < q.length) {
    return null; // not a full subsequence
  }

  // Prefer shorter targets when scores are otherwise close.
  score -= target.length * 0.01;
  return { score, positions };
}

function isBoundary(target: string, index: number): boolean {
  const prev = target[index - 1];
  const cur = target[index];
  if (prev === undefined || cur === undefined) {
    return false;
  }
  const isSep = /[\s\-_./]/.test(prev);
  const isCamel = prev === prev.toLowerCase() && cur === cur.toUpperCase();
  return isSep || isCamel;
}

/** A candidate to rank, carrying an opaque payload of type `T`. */
export interface FuzzyCandidate<T> {
  readonly text: string;
  readonly value: T;
}

/** A ranked result: the candidate plus its match. */
export interface FuzzyResult<T> {
  readonly value: T;
  readonly text: string;
  readonly match: FuzzyMatch;
}

/**
 * Rank candidates against a query, best first. Non-matching candidates are
 * dropped. With an empty query, candidates are returned in their original order.
 */
export function fuzzyRank<T>(
  query: string,
  candidates: readonly FuzzyCandidate<T>[],
): readonly FuzzyResult<T>[] {
  const results: FuzzyResult<T>[] = [];
  for (const candidate of candidates) {
    const match = fuzzyScore(query, candidate.text);
    if (match !== null) {
      results.push({ value: candidate.value, text: candidate.text, match });
    }
  }
  if (query.length === 0) {
    return results;
  }
  return results.sort((a, b) => b.match.score - a.match.score);
}
