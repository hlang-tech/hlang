/** Short, aligned text for the times the run views show. */

/** How long a delivery took: `<0.01 ms`, `0.12 ms`, `4.6 ms`, `42 ms`, `1.52 s`. */
export function formatDuration(ms: number): string {
  if (ms === 0) {
    return '0 ms';
  }
  if (ms < 0.01) {
    return '<0.01 ms';
  }
  if (ms < 1) {
    return `${ms.toFixed(2)} ms`;
  }
  if (ms < 10) {
    return `${ms.toFixed(1)} ms`;
  }
  if (ms < 1000) {
    return `${Math.round(ms).toString()} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

/** When something happened, in seconds since the run started: `0.013s`. */
export function formatElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(3)}s`;
}
